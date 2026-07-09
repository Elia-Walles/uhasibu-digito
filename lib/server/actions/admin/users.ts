"use server";
import { adminDb } from "@/lib/server/admin-db";
import { withAdminAuth } from "@/lib/server/with-admin-auth";
import { writePlatformAudit } from "@/lib/server/admin-audit";
import { updateUserRoleSchema, updateUserSchema, setUserDisabledSchema, tenantIdSchema } from "@/lib/server/schemas/admin";
import { ok, err, type Result } from "@/lib/server/result";
import { iso } from "@/lib/server/serialize";
import type { UserRole } from "@/types";
import type { AdminUserRow } from "./types";

function rowToUser(u: {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  isSuperAdmin: boolean;
  tenantId: string | null;
  disabledAt: Date | null;
  createdAt: Date;
  tenant?: { name: string } | null;
}): AdminUserRow {
  return {
    id: u.id,
    name: u.name ?? "",
    email: u.email ?? "",
    role: u.role as UserRole,
    isSuperAdmin: u.isSuperAdmin,
    tenantId: u.tenantId,
    tenantName: u.tenant?.name ?? null,
    disabledAt: u.disabledAt ? iso(u.disabledAt) : null,
    createdAt: iso(u.createdAt),
  };
}

export async function listUsers(): Promise<AdminUserRow[]> {
  return withAdminAuth(async () => {
    const rows = await adminDb.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { tenant: { select: { name: true } } },
    });
    return rows.map(rowToUser);
  });
}

/** Users belonging to a single tenant (drill-down). */
export async function listTenantUsers(input: unknown): Promise<Result<AdminUserRow[]>> {
  const parsed = tenantIdSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { tenantId } = parsed.data;
  return withAdminAuth(async () => {
    const rows = await adminDb.user.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: { tenant: { select: { name: true } } },
    });
    return ok(rows.map(rowToUser));
  });
}

export async function updateUserRole(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = updateUserRoleSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { userId, role } = parsed.data;
  return withAdminAuth(async (ctx) => {
    const before = await adminDb.user.findUnique({ where: { id: userId }, select: { role: true, tenantId: true } });
    if (!before) return err("User not found");
    await adminDb.user.update({ where: { id: userId }, data: { role } });
    await writePlatformAudit(ctx, {
      action: "user.role.change",
      targetType: "User",
      targetId: userId,
      targetTenantId: before.tenantId ?? undefined,
      details: { from: before.role, to: role },
    });
    return ok({ id: userId });
  });
}

export async function updateUser(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { userId, name, email } = parsed.data;
  return withAdminAuth(async (ctx) => {
    const before = await adminDb.user.findUnique({ where: { id: userId }, select: { name: true, email: true, tenantId: true } });
    if (!before) return err("User not found");
    const updates: { name?: string; email?: string } = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    await adminDb.user.update({ where: { id: userId }, data: updates });
    await writePlatformAudit(ctx, {
      action: "user.edit",
      targetType: "User",
      targetId: userId,
      targetTenantId: before.tenantId ?? undefined,
      details: { name: updates.name, email: updates.email },
    });
    return ok({ id: userId });
  });
}

export async function setUserDisabled(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = setUserDisabledSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { userId, disabled } = parsed.data;
  return withAdminAuth(async (ctx) => {
    if (userId === ctx.userId) return err("You can't deactivate your own account");
    const target = await adminDb.user.findUnique({ where: { id: userId }, select: { tenantId: true } });
    if (!target) return err("User not found");
    await adminDb.user.update({ where: { id: userId }, data: { disabledAt: disabled ? new Date() : null } });
    await writePlatformAudit(ctx, {
      action: disabled ? "user.deactivate" : "user.activate",
      targetType: "User",
      targetId: userId,
      targetTenantId: target.tenantId ?? undefined,
      details: { disabled },
    });
    return ok({ id: userId });
  });
}

export async function deleteUser(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = updateUserRoleSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { userId } = parsed.data;
  return withAdminAuth(async (ctx) => {
    if (userId === ctx.userId) return err("You can't delete your own account");
    const target = await adminDb.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, isSuperAdmin: true, tenantId: true },
    });
    if (!target) return err("User not found");
    if (target.isSuperAdmin) {
      const superAdminCount = await adminDb.user.count({ where: { isSuperAdmin: true } });
      if (superAdminCount <= 1) return err("Cannot delete the last super-admin");
    }
    const snapshot = { name: target.name, email: target.email };
    await adminDb.user.delete({ where: { id: userId } });
    await writePlatformAudit(ctx, {
      action: "user.delete",
      targetType: "User",
      targetId: userId,
      targetTenantId: target.tenantId ?? undefined,
      details: snapshot,
    });
    return ok({ id: userId });
  });
}
