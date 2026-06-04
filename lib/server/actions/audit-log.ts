"use server";
import type { AuditLog as DbAuditLog } from "@prisma/client";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import type { AuditLog, AuditAction } from "@/types";

function rowToLog(r: DbAuditLog): AuditLog {
  return {
    id: r.id,
    timestamp: r.timestamp.toISOString(),
    userId: r.userId ?? "",
    userName: r.userName,
    action: r.action as AuditAction,
    module: r.module,
    recordRef: r.recordRef,
    ipAddress: r.ipAddress,
    details: r.details,
  };
}

export async function listAuditLogs(): Promise<AuditLog[]> {
  return withAuth(async () => {
    const rows = await db.auditLog.findMany({ orderBy: { timestamp: "desc" }, take: 200 });
    return rows.map(rowToLog);
  });
}
