"use server";
import { randomBytes, createHash } from "node:crypto";
import { authDb } from "@/lib/server/auth-db";
import { db } from "@/lib/server/db";
import { withAuth, requireAdmin } from "@/lib/server/with-auth";
import { ok, err, type Result } from "@/lib/server/result";
import { sendMail, emailConfigured } from "@/lib/server/email";
import { staffInviteEmail } from "@/lib/server/email-templates";
import {
  inviteStaffSchema,
  updateStaffSchema,
  setStaffDisabledSchema,
  staffIdSchema,
} from "@/lib/server/schemas/staff";
import { INVITABLE_ROLES, isBranchRestricted } from "@/lib/auth/roles";
import type { UserRole } from "@/types";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}
function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId: string | null;
  branchName: string;
  status: "active" | "pending" | "disabled";
  isAdmin: boolean;
}

/** Issue a single-use invite token (reuses the password-reset table) and email the set-password link.
 *  Valid one hour. Returns the raw link (surfaced as devLink when SMTP is off). */
async function issueInvite(
  userId: string,
  email: string,
  name: string | null,
  companyName: string,
  roleLabel: string,
  branchName: string | undefined,
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await authDb.passwordResetToken.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  const link = `${appUrl()}/reset-password?token=${token}`;
  if (emailConfigured()) {
    const { html, text } = staffInviteEmail({
      name,
      companyName,
      roleLabel,
      ...(branchName ? { branchName } : {}),
      inviteUrl: link,
    });
    await sendMail({ to: email, subject: `You've been added to ${companyName} on Uhasibu Digito`, html, text });
  }
  return link;
}

/** All staff of the tenant (Admin only). Excludes platform super-admins. */
export async function listStaff(): Promise<Result<StaffMember[]>> {
  return withAuth(async (ctx) => {
    requireAdmin(ctx);
    // Users live on the Auth.js tables (not tenant-scoped by the extension) query the raw client
    // with an explicit tenant filter.
    const users = await authDb.user.findMany({
      where: { tenantId: ctx.tenantId, isSuperAdmin: false },
      orderBy: { createdAt: "asc" },
    });
    const branches = await db.branch.findMany();
    const nameFor = (id: string | null) => branches.find((b) => b.id === id)?.name ?? "";
    return ok(
      users.map((u) => ({
        id: u.id,
        name: u.name ?? "",
        email: u.email ?? "",
        role: u.role as UserRole,
        branchId: u.branchId ?? null,
        branchName: nameFor(u.branchId),
        status: u.disabledAt ? "disabled" : !u.passwordHash ? "pending" : "active",
        isAdmin: u.role === "Admin",
      })),
    );
  });
}

/** Create a staff sub-account and email them an invite to set their password (Admin only). */
export async function inviteStaff(input: unknown): Promise<Result<{ devLink?: string }>> {
  const parsed = inviteStaffSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  return withAuth(async (ctx) => {
    requireAdmin(ctx);
    if (!INVITABLE_ROLES.includes(d.role)) return err("That role can't be assigned");
    if (isBranchRestricted(d.role) && !d.branchId) return err("Select a branch for this role");

    const email = d.email.toLowerCase();
    if (await authDb.user.findUnique({ where: { email } })) {
      return err("A user with this email already exists");
    }

    let branchName = "";
    if (d.branchId) {
      const branch = await db.branch.findFirst({ where: { id: d.branchId } });
      if (!branch) return err("Selected branch not found");
      branchName = branch.name;
    }

    const tenant = await authDb.tenant.findUnique({ where: { id: ctx.tenantId }, select: { name: true } });
    const user = await authDb.user.create({
      data: {
        email,
        name: d.name,
        role: d.role,
        tenantId: ctx.tenantId,
        ...(d.branchId ? { branchId: d.branchId } : {}),
        emailVerified: new Date(), // owner-vouched; they still set a password via the invite link
        initials: initialsFrom(d.name),
      },
    });

    const link = await issueInvite(user.id, email, d.name, tenant?.name ?? "your company", d.role, branchName || undefined);
    return ok(emailConfigured() ? {} : { devLink: link });
  });
}

/** Change a staff member's role and/or branch (Admin only; can't edit yourself). */
export async function updateStaff(input: unknown): Promise<Result<true>> {
  const parsed = updateStaffSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  return withAuth(async (ctx) => {
    requireAdmin(ctx);
    if (d.id === ctx.userId) return err("You can't change your own account here");
    const target = await authDb.user.findUnique({ where: { id: d.id } });
    if (!target || target.tenantId !== ctx.tenantId) return err("Staff member not found");

    const finalRole = (d.role ?? target.role) as UserRole;
    const finalBranch = d.branchId !== undefined ? (d.branchId || null) : target.branchId;
    if (isBranchRestricted(finalRole) && !finalBranch) return err("Select a branch for this role");
    if (d.branchId) {
      const branch = await db.branch.findFirst({ where: { id: d.branchId } });
      if (!branch) return err("Selected branch not found");
    }

    await authDb.user.update({
      where: { id: d.id },
      data: {
        ...(d.role !== undefined ? { role: d.role } : {}),
        ...(d.branchId !== undefined ? { branchId: d.branchId || null } : {}),
      },
    });
    return ok(true);
  });
}

/** Activate/deactivate a staff member (Admin only; can't deactivate yourself). */
export async function setStaffDisabled(input: unknown): Promise<Result<true>> {
  const parsed = setStaffDisabledSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  return withAuth(async (ctx) => {
    requireAdmin(ctx);
    if (d.id === ctx.userId) return err("You can't deactivate your own account");
    const target = await authDb.user.findUnique({ where: { id: d.id } });
    if (!target || target.tenantId !== ctx.tenantId) return err("Staff member not found");
    await authDb.user.update({ where: { id: d.id }, data: { disabledAt: d.disabled ? new Date() : null } });
    return ok(true);
  });
}

/** Re-send the invite (set-password) email to a still-pending staff member (Admin only). */
export async function resendStaffInvite(input: unknown): Promise<Result<{ devLink?: string }>> {
  const parsed = staffIdSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");

  return withAuth(async (ctx) => {
    requireAdmin(ctx);
    const target = await authDb.user.findUnique({ where: { id: parsed.data.id } });
    if (!target || target.tenantId !== ctx.tenantId) return err("Staff member not found");
    if (target.passwordHash) return err("This user has already set their password");
    const branch = target.branchId ? await db.branch.findFirst({ where: { id: target.branchId } }) : null;
    const tenant = await authDb.tenant.findUnique({ where: { id: ctx.tenantId }, select: { name: true } });
    const link = await issueInvite(
      target.id,
      target.email ?? "",
      target.name,
      tenant?.name ?? "your company",
      target.role,
      branch?.name,
    );
    return ok(emailConfigured() ? {} : { devLink: link });
  });
}
