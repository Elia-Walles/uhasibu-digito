"use server";
import { adminDb } from "@/lib/server/admin-db";
import { withAdminAuth } from "@/lib/server/with-admin-auth";
import { iso } from "@/lib/server/serialize";
import type { AdminAuditRow } from "./types";

export async function listPlatformAudit(limit = 200): Promise<AdminAuditRow[]> {
  const take = Math.min(Math.max(limit, 1), 500);
  return withAdminAuth(async () => {
    const rows = await adminDb.platformAuditLog.findMany({ orderBy: { createdAt: "desc" }, take });
    return rows.map((r) => ({
      id: r.id,
      actorEmail: r.actorEmail,
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      targetTenantId: r.targetTenantId,
      details: r.details,
      createdAt: iso(r.createdAt),
    }));
  });
}
