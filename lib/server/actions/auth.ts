"use server";
import { randomBytes, createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { authDb } from "@/lib/server/auth-db";
import {
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type RegisterInput,
} from "@/lib/server/schemas/auth";
import { ok, err, type Result } from "@/lib/server/result";
import { sendMail } from "@/lib/server/email";

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
 * Registers a new company: creates the Tenant and its first User (the owner) in a
 * single transaction. Uses the raw, unscoped client because no tenant is bound yet.
 * The client signs the user in via `signIn("credentials", ...)` after this returns ok.
 */
export async function registerTenant(
  input: RegisterInput,
): Promise<Result<{ userId: string; tenantId: string }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { name, companyName, email, password, phone, businessType, region } = parsed.data;

  const existing = await authDb.user.findUnique({ where: { email } });
  if (existing) {
    return err("An account with this email already exists");
  }

  const passwordHash = await hash(password, 12);
  const baseSlug = slugify(companyName);

  try {
    const result = await authDb.$transaction(async (tx) => {
      let slug = baseSlug;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const clash = await tx.tenant.findUnique({ where: { slug } });
        if (!clash) break;
        slug = `${baseSlug}-${attempt + 2}`;
      }
      // New tenants start on the `free` tier — they pick a plan on /select-plan next.
      const tenant = await tx.tenant.create({ data: { name: companyName, slug, tier: "free" } });
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: "Admin",
          initials: initialsFrom(name),
          tenantId: tenant.id,
          ...(phone ? { phone } : {}),
        },
      });
      // Seed the company profile + primary branch so the app has somewhere to hang data.
      await tx.companyProfile.create({
        data: {
          tenantId: tenant.id,
          name: companyName,
          email,
          region,
          businessType,
          baseCurrency: "TZS",
          ...(phone ? { phone } : {}),
        },
      });
      await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: "Main Branch",
          code: "BR-001",
          region,
          isPrimary: true,
        },
      });
      return { userId: user.id, tenantId: tenant.id };
    });
    return ok(result);
  } catch {
    return err("Could not create your account. Please try again.");
  }
}

/**
 * Starts a password reset: issues a single-use token (only its hash is stored), valid for
 * one hour, and emails the reset link. Always returns ok — never reveal whether an account
 * exists for the address.
 */
export async function requestPasswordReset(input: unknown): Promise<Result<true>> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { email } = parsed.data;

  const user = await authDb.user.findUnique({ where: { email } });
  if (user) {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await authDb.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
    });
    const link = `${appUrl()}/reset-password?token=${token}`;
    await sendMail({
      to: email,
      subject: "Reset your Uhasibu Digito password",
      html: `<p>Hello${user.name ? ` ${user.name}` : ""},</p><p>We received a request to reset your password. Click the link below to choose a new one — it expires in one hour.</p><p><a href="${link}">Reset my password</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
    });
  }
  return ok(true);
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
    authDb.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    authDb.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ]);
  return ok(true);
}
