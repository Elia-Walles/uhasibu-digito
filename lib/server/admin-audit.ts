import { adminDb } from "./admin-db";
import type { AdminContext } from "./with-admin-auth";

export type PlatformAuditTarget = "Tenant" | "User" | "Subscription" | "Payment" | "Plan" | "SubscriptionInvoice";

export interface PlatformAuditInput {
  action: string; // e.g. "tenant.tier.change", "payment.record"
  targetType: PlatformAuditTarget;
  targetId: string;
  targetTenantId?: string | undefined;
  details?: unknown; // JSON-serialized into the Text column
}

/**
 * Append a row to the global PlatformAuditLog. Called from admin Server Actions after a
 * successful mutation. Never throws into the caller an audit failure must not roll back
 * the operation the operator already performed.
 */
export async function writePlatformAudit(ctx: AdminContext, input: PlatformAuditInput): Promise<void> {
  try {
    await adminDb.platformAuditLog.create({
      data: {
        actorUserId: ctx.userId,
        actorEmail: ctx.email,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        targetTenantId: input.targetTenantId ?? null,
        details: input.details === undefined ? "" : JSON.stringify(input.details),
      },
    });
  } catch {
    // Swallow auditing is best-effort and must not break the operator's action.
  }
}
