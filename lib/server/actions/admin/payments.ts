"use server";
import { adminDb } from "@/lib/server/admin-db";
import { withAdminAuth } from "@/lib/server/with-admin-auth";
import { writePlatformAudit } from "@/lib/server/admin-audit";
import { recordPaymentSchema, paymentIdSchema, tenantIdSchema } from "@/lib/server/schemas/admin";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum, iso } from "@/lib/server/serialize";
import type { AdminPaymentRow } from "./types";

function rowToPayment(p: {
  id: string;
  tenantId: string;
  amountTzs: { toNumber(): number } | number;
  method: string;
  reference: string;
  status: string;
  paidAt: Date;
  note: string;
}, tenantName: string | null): AdminPaymentRow {
  return {
    id: p.id,
    tenantId: p.tenantId,
    tenantName,
    amountTzs: decToNum(p.amountTzs),
    method: p.method,
    reference: p.reference,
    status: p.status,
    paidAt: iso(p.paidAt),
    note: p.note,
  };
}

export async function listPayments(): Promise<AdminPaymentRow[]> {
  return withAdminAuth(async () => {
    const rows = await adminDb.payment.findMany({ orderBy: { paidAt: "desc" } });
    const tenantNames = new Map(
      (await adminDb.tenant.findMany({ select: { id: true, name: true } })).map((t) => [t.id, t.name]),
    );
    return rows.map((p) => rowToPayment(p, tenantNames.get(p.tenantId) ?? null));
  });
}

export async function listTenantPayments(input: unknown): Promise<Result<AdminPaymentRow[]>> {
  const parsed = tenantIdSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { tenantId } = parsed.data;
  return withAdminAuth(async () => {
    const rows = await adminDb.payment.findMany({ where: { tenantId }, orderBy: { paidAt: "desc" } });
    return ok(rows.map((p) => rowToPayment(p, null)));
  });
}

export async function recordPayment(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  return withAdminAuth(async (ctx) => {
    const tenant = await adminDb.tenant.findUnique({ where: { id: d.tenantId }, select: { id: true } });
    if (!tenant) return err("Tenant not found");
    const created = await adminDb.payment.create({
      data: {
        tenantId: d.tenantId,
        amountTzs: d.amountTzs,
        method: d.method,
        reference: d.reference,
        paidAt: d.paidAt,
        note: d.note,
        recordedById: ctx.userId,
        ...(d.subscriptionId ? { subscriptionId: d.subscriptionId } : {}),
      },
    });
    await writePlatformAudit(ctx, {
      action: "payment.record",
      targetType: "Payment",
      targetId: created.id,
      targetTenantId: d.tenantId,
      details: { amountTzs: d.amountTzs, method: d.method, reference: d.reference },
    });
    return ok({ id: created.id });
  });
}

export async function reversePayment(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = paymentIdSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { paymentId } = parsed.data;
  return withAdminAuth(async (ctx) => {
    const p = await adminDb.payment.findUnique({ where: { id: paymentId } });
    if (!p) return err("Payment not found");
    if (p.status === "reversed") return err("Payment is already reversed");
    await adminDb.payment.update({ where: { id: paymentId }, data: { status: "reversed" } });
    await writePlatformAudit(ctx, {
      action: "payment.reverse",
      targetType: "Payment",
      targetId: paymentId,
      targetTenantId: p.tenantId,
    });
    return ok({ id: paymentId });
  });
}
