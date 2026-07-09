import type { db } from "./db";
import type { RequestContext } from "./request-context";

type Tx = Omit<typeof db, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export interface AuditEvent {
  action: string; // Created | Modified | Deleted | Posted | Reversed | Approved | Exported …
  module: string;
  recordRef: string;
  details: string;
}

/** Records an immutable audit-trail entry for a tenant action. Call inside the mutation's tx. */
export async function recordAudit(tx: Tx, tenantId: string, ctx: RequestContext, e: AuditEvent): Promise<void> {
  await tx.auditLog.create({
    data: {
      tenantId,
      userId: ctx.userId,
      userName: ctx.userName || "System",
      action: e.action,
      module: e.module,
      recordRef: e.recordRef,
      ipAddress: "server",
      details: e.details,
    },
  });
}

/** Best-effort module classification from a journal reference prefix. */
export function moduleForRef(ref: string): string {
  if (ref.startsWith("INV")) return "Invoices";
  if (ref.startsWith("POS")) return "Point of Sale";
  if (ref.startsWith("PAY")) return "Payroll";
  if (ref.startsWith("FA-") || ref.startsWith("DEP-")) return "Fixed Assets";
  if (ref.startsWith("PO-") || ref.startsWith("SUP-")) return "Procurement";
  if (ref.startsWith("TAX-")) return "Tax";
  if (ref.startsWith("BANK-")) return "Banking";
  return "General Ledger";
}
