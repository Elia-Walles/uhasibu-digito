"use server";
import type { SubscriptionInvoice } from "@prisma/client";
import { adminDb } from "@/lib/server/admin-db";
import { withAdminAuth, type AdminContext } from "@/lib/server/with-admin-auth";
import { writePlatformAudit } from "@/lib/server/admin-audit";
import { sendMail } from "@/lib/server/email";
import { notifyTenantOwner } from "@/lib/server/notify";
import { subscriptionInvoiceIdSchema, subscriptionInvoiceIdsSchema } from "@/lib/server/schemas/billing";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum, iso } from "@/lib/server/serialize";
import type { AdminSubscriptionInvoiceRow } from "./types";

function appBase(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "";
}

function rowToInvoice(
  r: {
    id: string;
    number: string;
    tenantId: string;
    planKey: string;
    planName: string;
    amountTzs: { toNumber(): number } | number;
    currency: string;
    status: string;
    issuedAt: Date;
    dueAt: Date;
    submittedAt: Date | null;
    paidAt: Date | null;
    billToCompany: string;
    billToEmail: string;
  },
  tenantName: string | null,
): AdminSubscriptionInvoiceRow {
  return {
    id: r.id,
    number: r.number,
    tenantId: r.tenantId,
    tenantName,
    planKey: r.planKey,
    planName: r.planName,
    amountTzs: decToNum(r.amountTzs),
    currency: r.currency,
    status: r.status,
    issuedAt: iso(r.issuedAt),
    dueAt: iso(r.dueAt),
    submittedAt: r.submittedAt ? iso(r.submittedAt) : null,
    paidAt: r.paidAt ? iso(r.paidAt) : null,
    billToCompany: r.billToCompany,
    billToEmail: r.billToEmail,
  };
}

export async function listSubscriptionInvoices(): Promise<AdminSubscriptionInvoiceRow[]> {
  return withAdminAuth(async () => {
    const rows = await adminDb.subscriptionInvoice.findMany({ orderBy: { createdAt: "desc" } });
    const tenantNames = new Map(
      (await adminDb.tenant.findMany({ select: { id: true, name: true } })).map((t) => [t.id, t.name]),
    );
    return rows.map((r) => rowToInvoice(r, tenantNames.get(r.tenantId) ?? null));
  });
}

/**
 * The approval mutation for one (validated, unpaid) invoice: marks it paid, activates/replaces the
 * tenant's subscription, records a bank Payment, sets Tenant.tier + status="active", audits, and
 * notifies + emails the tenant that their account is now active. Shared by single + bulk approval.
 */
async function approveOne(ctx: AdminContext, inv: SubscriptionInvoice): Promise<void> {
  const now = new Date();
  const periodEnd = new Date(now);
  if (inv.billingInterval === "month") periodEnd.setMonth(periodEnd.getMonth() + 1);
  else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  const amount = decToNum(inv.amountTzs);
  const plan = await adminDb.plan.findUnique({ where: { key: inv.planKey } });

  let subscriptionId: string | undefined;
  if (plan) {
    await adminDb.subscription.updateMany({
      where: { tenantId: inv.tenantId, status: "active" },
      data: { status: "canceled", canceledAt: now },
    });
    const sub = await adminDb.subscription.create({
      data: { tenantId: inv.tenantId, planId: plan.id, status: "active", amountTzs: amount, currentPeriodEnd: periodEnd },
    });
    subscriptionId = sub.id;
  }

  await adminDb.payment.create({
    data: {
      tenantId: inv.tenantId,
      amountTzs: amount,
      method: "bank",
      reference: inv.number,
      status: "recorded",
      paidAt: now,
      note: `Bank transfer approved for subscription invoice ${inv.number}`,
      recordedById: ctx.userId,
      ...(subscriptionId ? { subscriptionId } : {}),
    },
  });

  await adminDb.subscriptionInvoice.update({ where: { id: inv.id }, data: { status: "paid", paidAt: now, approvedById: ctx.userId } });
  await adminDb.tenant.update({ where: { id: inv.tenantId }, data: { tier: inv.planKey, status: "active" } });

  await writePlatformAudit(ctx, {
    action: "subscription_invoice.approve",
    targetType: "SubscriptionInvoice",
    targetId: inv.id,
    targetTenantId: inv.tenantId,
    details: { number: inv.number, planKey: inv.planKey, amountTzs: amount },
  });

  // Notify + email the tenant that their payment is confirmed and the account is live.
  try {
    const owner = await notifyTenantOwner(inv.tenantId, {
      type: "payment",
      title: "Payment approved — account activated",
      body: `Your payment for ${inv.number} is confirmed. Your account is active on the ${inv.planName} plan.`,
      link: "/dashboard",
      tenantId: inv.tenantId,
    });
    const to = owner?.email || inv.billToEmail;
    if (to) {
      const { subscriptionApprovedEmail } = await import("@/lib/server/email-templates");
      const { html, text } = subscriptionApprovedEmail({ companyName: inv.billToCompany, planName: inv.planName, periodEnd: periodEnd.toISOString(), dashboardUrl: `${appBase()}/dashboard` });
      await sendMail({ to, subject: "Payment confirmed — your account is active", html, text });
    }
  } catch (e) {
    console.error("[admin] approve notify failed:", e);
  }
}

/** Approves a single bank-transfer subscription invoice (validates, then runs the shared core). */
export async function approveSubscriptionInvoice(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = subscriptionInvoiceIdSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { invoiceId } = parsed.data;

  return withAdminAuth(async (ctx) => {
    const inv = await adminDb.subscriptionInvoice.findUnique({ where: { id: invoiceId } });
    if (!inv) return err("Invoice not found");
    if (inv.status === "paid") return err("This invoice is already approved");
    if (inv.status === "cancelled") return err("This invoice was cancelled");
    await approveOne(ctx, inv);
    return ok({ id: inv.id });
  });
}

/** Bulk-approve the selected invoice-method payments; skips ones already paid/cancelled. */
export async function approveSubscriptionInvoices(input: unknown): Promise<Result<{ approved: number; skipped: { id: string; reason: string }[] }>> {
  const parsed = subscriptionInvoiceIdsSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { invoiceIds } = parsed.data;

  return withAdminAuth(async (ctx) => {
    let approved = 0;
    const skipped: { id: string; reason: string }[] = [];
    for (const id of invoiceIds) {
      const inv = await adminDb.subscriptionInvoice.findUnique({ where: { id } });
      if (!inv) { skipped.push({ id, reason: "not found" }); continue; }
      if (inv.status === "paid") { skipped.push({ id, reason: "already approved" }); continue; }
      if (inv.status === "cancelled") { skipped.push({ id, reason: "cancelled" }); continue; }
      try {
        await approveOne(ctx, inv);
        approved += 1;
      } catch (e) {
        console.error(`[admin] bulk approve failed for ${id}:`, e);
        skipped.push({ id, reason: "error" });
      }
    }
    return ok({ approved, skipped });
  });
}

/** Cancels an invoice and reopens the tenant so they can pick a plan again; notifies the tenant. */
export async function cancelSubscriptionInvoice(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = subscriptionInvoiceIdSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { invoiceId } = parsed.data;

  return withAdminAuth(async (ctx) => {
    const inv = await adminDb.subscriptionInvoice.findUnique({ where: { id: invoiceId } });
    if (!inv) return err("Invoice not found");
    if (inv.status === "paid") return err("A paid invoice cannot be cancelled");

    await adminDb.subscriptionInvoice.update({ where: { id: inv.id }, data: { status: "cancelled" } });
    await adminDb.tenant.update({ where: { id: inv.tenantId }, data: { status: "active" } });

    await writePlatformAudit(ctx, {
      action: "subscription_invoice.cancel",
      targetType: "SubscriptionInvoice",
      targetId: inv.id,
      targetTenantId: inv.tenantId,
      details: { number: inv.number },
    });

    try {
      const owner = await notifyTenantOwner(inv.tenantId, {
        type: "warning",
        title: "Subscription invoice cancelled",
        body: `Invoice ${inv.number} was cancelled. You can choose a plan again to continue.`,
        link: "/select-plan",
        tenantId: inv.tenantId,
      });
      const to = owner?.email || inv.billToEmail;
      if (to) {
        const { subscriptionCancelledEmail } = await import("@/lib/server/email-templates");
        const { html, text } = subscriptionCancelledEmail({ companyName: inv.billToCompany, invoiceNumber: inv.number, selectPlanUrl: `${appBase()}/select-plan` });
        await sendMail({ to, subject: `Subscription invoice ${inv.number} cancelled`, html, text });
      }
    } catch (e) {
      console.error("[admin] cancel notify failed:", e);
    }
    return ok({ id: inv.id });
  });
}
