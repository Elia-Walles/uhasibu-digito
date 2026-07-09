"use server";
import { randomBytes, randomInt, createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { authDb } from "@/lib/server/auth-db";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import type { Prisma } from "@prisma/client";
import {
  registerCredentialsSchema,
  generateCodeSchema,
  verifyEmailCodeSchema,
  resendVerificationSchema,
  onboardingProfileSchema,
  onboardingDraftSchema,
  type OnboardingDraftInput,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/server/schemas/auth";
import { ok, err, type Result } from "@/lib/server/result";
import { sendMail, emailConfigured } from "@/lib/server/email";
import { verificationEmail, passwordResetEmail } from "@/lib/server/email-templates";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "tenant";
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/);
  const initials = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  return initials || "U";
}

/**
 * Issues a fresh single-use verification token for a user, stores only its SHA-256 hash, and emails
 * the branded "Get verification code" message whose button opens the code-generation page. Returns
 * the raw code-page link (surfaced as devLink when SMTP is off). Valid for 24 hours.
 */
async function issueVerificationToken(userId: string, email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await authDb.emailVerificationToken.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });
  const link = `${appUrl()}/verify-email/code?token=${token}`;
  const { html, text } = verificationEmail(link);
  await sendMail({ to: email, subject: "Verify your Uhasibu Digito email", html, text });
  return link;
}

/**
 * Registers login credentials only (email + password). Creates the Tenant (on the `free` tier,
 * named from the email local-part as a placeholder) and its first User (the owner, email NOT yet
 * verified), then emails a verification link. The user completes business details + plan in the
 * onboarding wizard after verifying and signing in. Uses the raw, unscoped client no tenant is
 * bound yet. When SMTP is unconfigured, `devLink` carries the link back so the flow stays testable.
 */
export async function registerCredentials(
  input: unknown,
): Promise<Result<{ email: string; devLink?: string }>> {
  const parsed = registerCredentialsSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { email, password } = parsed.data;

  const existing = await authDb.user.findUnique({ where: { email } });
  if (existing) {
    return err("An account with this email already exists");
  }

  const passwordHash = await hash(password, 12);
  const localPart = email.split("@")[0] ?? "tenant";
  const baseSlug = slugify(localPart);

  try {
    const user = await authDb.$transaction(async (tx) => {
      let slug = baseSlug;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const clash = await tx.tenant.findUnique({ where: { slug } });
        if (!clash) break;
        slug = `${baseSlug}-${attempt + 2}`;
      }
      // Placeholder tenant name the real company name is captured in onboarding.
      const tenant = await tx.tenant.create({ data: { name: localPart, slug, tier: "free" } });
      return tx.user.create({
        data: {
          email,
          passwordHash,
          role: "Admin",
          tenantId: tenant.id,
          // emailVerified intentionally left null until the link is clicked.
        },
      });
    });

    const link = await issueVerificationToken(user.id, email);
    return ok({ email, ...(emailConfigured() ? {} : { devLink: link }) });
  } catch {
    return err("Could not create your account. Please try again.");
  }
}

/**
 * Opened by the email button's code page: validates the link token (unused, unexpired), generates a
 * fresh 6-digit code, stores only its hash (15-minute expiry) on the token row, and returns the code
 * once (plus the account email so the page can hand off to the verification screen). Regenerates on
 * each call the page auto-calls this on load.
 */
export async function generateVerificationCode(
  input: unknown,
): Promise<Result<{ code: string; email: string }>> {
  const parsed = generateCodeSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid token");
  const { token } = parsed.data;

  const row = await authDb.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { email: true, emailVerified: true } } },
  });
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return err("This verification link is invalid or has expired. Please request a new one.");
  }
  if (row.user?.emailVerified) return err("This email is already verified. You can sign in.");

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await authDb.emailVerificationToken.update({
    where: { id: row.id },
    data: { codeHash: hashToken(code), codeExpiresAt: new Date(Date.now() + 15 * 60 * 1000) },
  });
  return ok({ code, email: row.user?.email ?? "" });
}

/**
 * Completes verification: matches the entered 6-digit code against the user's active (unused,
 * unexpired) code hashes, marks the email verified, and burns that token. One code per attempt.
 */
export async function verifyEmailCode(input: unknown): Promise<Result<true>> {
  const parsed = verifyEmailCodeSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { email, code } = parsed.data;

  const user = await authDb.user.findUnique({ where: { email }, select: { id: true, emailVerified: true } });
  if (!user) return err("That code is invalid or has expired. Please request a new one.");
  if (user.emailVerified) return ok(true);

  const codeHash = hashToken(code);
  const match = await authDb.emailVerificationToken.findFirst({
    where: { userId: user.id, usedAt: null, codeHash, codeExpiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!match) return err("That code is invalid or has expired. Please request a new one.");

  await authDb.$transaction([
    authDb.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } }),
    authDb.emailVerificationToken.update({ where: { id: match.id }, data: { usedAt: new Date() } }),
  ]);
  return ok(true);
}

/**
 * Re-issues a verification link for an unverified account. Always returns ok (a verified or
 * unknown email is a silent no-op). `devLink` is returned only when SMTP is unconfigured.
 */
export async function resendVerification(input: unknown): Promise<Result<{ devLink?: string }>> {
  const parsed = resendVerificationSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { email } = parsed.data;

  const user = await authDb.user.findUnique({ where: { email } });
  if (user && !user.emailVerified) {
    const link = await issueVerificationToken(user.id, email);
    return ok(emailConfigured() ? {} : { devLink: link });
  }
  return ok({});
}

/**
 * Whether the account for `email` still needs to verify. Lets the login page explain a blocked
 * sign-in ("verify your email") vs. a genuine bad-credentials error. Account existence is already
 * discoverable via the register path, so this reveals nothing new.
 */
export async function getVerificationState(
  input: unknown,
): Promise<"unverified" | "verified" | "unknown"> {
  const parsed = resendVerificationSchema.safeParse(input);
  if (!parsed.success) return "unknown";
  const user = await authDb.user.findUnique({
    where: { email: parsed.data.email },
    select: { emailVerified: true },
  });
  if (!user) return "unknown";
  return user.emailVerified ? "verified" : "unverified";
}

/**
 * Whether `email` is free to register. Powers the live availability check on the sign-up form so a
 * duplicate is surfaced inline before submit. Account existence is already discoverable via the
 * register path, so this reveals nothing new. Bad-format input returns `available: true` and lets
 * the email field's own format validation handle it.
 */
export async function checkEmailAvailability(input: unknown): Promise<{ available: boolean }> {
  const parsed = resendVerificationSchema.safeParse(input);
  if (!parsed.success) return { available: true };
  const user = await authDb.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  return { available: !user };
}

/**
 * Completes registration after login: saves the business essentials onto the tenant. Updates the
 * CompanyProfile (creating it if absent), names the tenant, sets the owner's display name, and
 * ensures a primary branch exists. Runs inside the tenant context. Plan selection is a separate
 * step (billing.selectPlan) in the wizard.
 */
/**
 * Maps a (partial) onboarding input onto CompanyProfile columns. Only keys present on the input are
 * included so Prisma leaves the rest untouched (autosave sends partials). `district` mirrors into the
 * legacy `region` column and `street` into `address` so downstream code that reads those keeps working.
 */
// Plain scalar shape (not Prisma's *UpdateOperationsInput union) so the same object is assignable to
// both updateMany and create without exactOptionalPropertyTypes friction.
interface CompanyProfileFields {
  name?: string;
  businessType?: string;
  country?: string;
  countryCode?: string;
  district?: string;
  region?: string;
  street?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  heardFrom?: string;
  phone?: string;
  phoneCountryCode?: string;
}

function profileDataFromInput(d: OnboardingDraftInput): CompanyProfileFields {
  const data: CompanyProfileFields = {};
  if (d.companyName !== undefined) data.name = d.companyName;
  if (d.businessType !== undefined) data.businessType = d.businessType;
  if (d.country !== undefined) data.country = d.country;
  if (d.countryCode !== undefined) data.countryCode = d.countryCode;
  if (d.region !== undefined) data.region = d.region;
  if (d.district !== undefined) data.district = d.district;
  if (d.street !== undefined) {
    data.street = d.street;
    data.address = d.street;
  }
  if (d.latitude !== undefined) data.latitude = d.latitude;
  if (d.longitude !== undefined) data.longitude = d.longitude;
  if (d.heardFrom !== undefined) data.heardFrom = d.heardFrom;
  if (d.phone !== undefined) data.phone = d.phone;
  if (d.phoneCountryCode !== undefined) data.phoneCountryCode = d.phoneCountryCode;
  return data;
}

/** Writes the provided onboarding fields to the tenant's User/Tenant/CompanyProfile. Shared by the
 * debounced autosave (partial) and the final submit. Runs inside an established tenant context. */
async function persistOnboarding(ctx: { userId: string; tenantId: string }, d: OnboardingDraftInput) {
  // Owner identity + tenant name are tenancy roots not tenant-scoped, so use the raw client.
  const userData: Prisma.UserUpdateInput = {};
  if (d.name !== undefined) {
    userData.name = d.name;
    userData.initials = initialsFrom(d.name);
  }
  if (d.phone !== undefined) userData.phone = d.phone;
  if (Object.keys(userData).length) {
    await authDb.user.update({ where: { id: ctx.userId }, data: userData });
  }
  if (d.companyName !== undefined) {
    await authDb.tenant.update({ where: { id: ctx.tenantId }, data: { name: d.companyName } });
  }

  // CompanyProfile is tenant-scoped go through the scoped client.
  const profileData = profileDataFromInput(d);
  const existingProfile = await db.companyProfile.findFirst();
  if (existingProfile) {
    if (Object.keys(profileData).length) await db.companyProfile.updateMany({ data: profileData });
  } else {
    await db.companyProfile.create({
      data: { ...profileData, name: d.companyName ?? "", baseCurrency: "TZS", tenantId: ctx.tenantId },
    });
  }
}

/**
 * Loads the current onboarding draft so the wizard can resume where the user left off. Reads the
 * tenant's CompanyProfile plus the owner's name/phone; absent fields come back as empty strings.
 */
export async function getOnboardingDraft(): Promise<Result<OnboardingDraftInput>> {
  return withAuth(async (ctx) => {
    const profile = await db.companyProfile.findFirst();
    const user = await authDb.user.findUnique({
      where: { id: ctx.userId },
      select: { name: true, phone: true },
    });
    return ok({
      name: user?.name ?? "",
      companyName: profile?.name ?? "",
      businessType: profile?.businessType ?? "",
      country: profile?.country ?? "",
      countryCode: profile?.countryCode ?? "",
      region: profile?.region ?? "",
      district: profile?.district ?? "",
      street: profile?.street ?? "",
      ...(profile?.latitude != null ? { latitude: profile.latitude } : {}),
      ...(profile?.longitude != null ? { longitude: profile.longitude } : {}),
      heardFrom: profile?.heardFrom ?? "",
      phone: user?.phone ?? "",
      phoneCountryCode: profile?.phoneCountryCode ?? "",
    });
  });
}

/**
 * Debounced autosave target: persists whatever partial fields the user has entered so far so the
 * onboarding form survives a refresh or a return on another device. All fields optional.
 */
export async function saveOnboardingDraft(input: unknown): Promise<Result<true>> {
  const parsed = onboardingDraftSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  return withAuth(async (ctx) => {
    await persistOnboarding(ctx, parsed.data);
    return ok(true);
  });
}

export async function saveOnboardingProfile(input: unknown): Promise<Result<true>> {
  const parsed = onboardingProfileSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { region } = parsed.data;

  return withAuth(async (ctx) => {
    await persistOnboarding(ctx, parsed.data);

    const existingBranch = await db.branch.findFirst();
    if (!existingBranch) {
      await db.branch.create({
        data: { tenantId: ctx.tenantId, name: "Main Branch", code: "BR-001", region, isPrimary: true },
      });
    }

    return ok(true);
  });
}

/**
 * Starts a password reset: issues a single-use token (only its hash is stored), valid for
 * one hour, and emails the reset link. Always returns ok never reveal whether an account
 * exists for the address.
 */
export async function requestPasswordReset(input: unknown): Promise<Result<{ devLink?: string }>> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { email } = parsed.data;

  const user = await authDb.user.findUnique({ where: { email } });
  if (user) {
    // Invalidate any earlier unused reset tokens so only the newest link works.
    await authDb.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await authDb.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
    });
    const link = `${appUrl()}/reset-password?token=${token}`;
    const { html, text } = passwordResetEmail(user.name, link);
    await sendMail({ to: email, subject: "Reset your Uhasibu Digito password", html, text });
    // When SMTP is unconfigured, hand the link back so the reset stays completable (dev/preview).
    return ok(emailConfigured() ? {} : { devLink: link });
  }
  // Enumeration-safe: same shape whether or not the account exists.
  return ok({});
}

/**
 * Completes a password reset: validates the token (unused, unexpired), sets the new password
 * hash, and burns the token.
 */
export async function resetPassword(input: unknown): Promise<Result<true>> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { token, password } = parsed.data;

  const row = await authDb.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return err("This reset link is invalid or has expired. Please request a new one.");
  }

  const passwordHash = await hash(password, 12);
  await authDb.$transaction([
    // Clicking the emailed link proves ownership mark the email verified so a previously
    // unverified account can sign in with the new password immediately.
    authDb.user.update({ where: { id: row.userId }, data: { passwordHash, emailVerified: new Date() } }),
    authDb.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    // Burn any other outstanding reset links for this user.
    authDb.passwordResetToken.updateMany({
      where: { userId: row.userId, usedAt: null, id: { not: row.id } },
      data: { usedAt: new Date() },
    }),
  ]);
  return ok(true);
}
