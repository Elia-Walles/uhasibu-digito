"use server";
import { adminDb } from "@/lib/server/admin-db";
import { withAdminAuth } from "@/lib/server/with-admin-auth";
import { writePlatformAudit } from "@/lib/server/admin-audit";
import { grantSuperAdminSchema } from "@/lib/server/schemas/admin";
import { ok, err, type Result } from "@/lib/server/result";

export async function grantSuperAdmin(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = grantSuperAdminSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { userId } = parsed.data;
  return withAdminAuth(async (ctx) => {
    const user = await adminDb.user.findUnique({ where: { id: userId }, select: { isSuperAdmin: true, tenantId: true } });
    if (!user) return err("User not found");
    if (user.isSuperAdmin) return ok({ id: userId });
    await adminDb.user.update({ where: { id: userId }, data: { isSuperAdmin: true } });
    await writePlatformAudit(ctx, {
      action: "admin.grant",
      targetType: "User",
      targetId: userId,
      targetTenantId: user.tenantId ?? undefined,
    });
    return ok({ id: userId });
  });
}

export async function revokeSuperAdmin(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = grantSuperAdminSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { userId } = parsed.data;
  return withAdminAuth(async (ctx) => {
    const user = await adminDb.user.findUnique({ where: { id: userId }, select: { isSuperAdmin: true, tenantId: true } });
    if (!user) return err("User not found");
    if (!user.isSuperAdmin) return ok({ id: userId });
    // Never leave the platform with zero super-admins.
    const remaining = await adminDb.user.count({ where: { isSuperAdmin: true } });
    if (remaining <= 1) return err("Cannot revoke the last super-admin");
    await adminDb.user.update({ where: { id: userId }, data: { isSuperAdmin: false } });
    await writePlatformAudit(ctx, {
      action: "admin.revoke",
      targetType: "User",
      targetId: userId,
      targetTenantId: user.tenantId ?? undefined,
    });
    return ok({ id: userId });
  });
}
