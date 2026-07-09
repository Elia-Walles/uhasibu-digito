"use server";
import { z } from "zod";
import { auth } from "@/auth";
import { authDb } from "@/lib/server/auth-db";
import { withAuth } from "@/lib/server/with-auth";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum, iso } from "@/lib/server/serialize";
import { PLANS, type Tier } from "@/lib/auth/tiers";
import {
  createSubscriptionInvoiceSchema,
  subscriptionInvoiceIdSchema,
} from "@/lib/server/schemas/billing";
import { INVOICE_DUE_HOURS } from "@/lib/config/billing";
import { renderSubscriptionInvoicePdf } from "@/lib/server/subscription-invoice-pdf";
import { subscriptionInvoiceEmail, paymentSubmittedAdminEmail } from "@/lib/server/email-templates";
import { sendMail } from "@/lib/server/email";
import { notifySuperAdmins } from "@/lib/server/notify";
import type { SubscriptionInvoiceView, SubscriptionInvoiceStatus } from "@/types/billing";

const selectPlanSchema = z.object({
  tier: z.enum(["starter", "business", "standard", "premium"]),
});

/**
 * Legacy instant activation (no invoice). Retained for compatibility; the onboarding / select-plan
 * flows now go through createSubscriptionInvoice + admin approval instead.
 */
export async function selectPlan(input: unknown): Promise<Result<{ tier: Tier }>> {
  const parsed = selectPlanSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid plan");

  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return err("You must be signed in to choose a plan");

  try {
    await authDb.tenant.update({ where: { id: tenantId }, data: { tier: parsed.data.tier } });
    return ok({ tier: parsed.data.tier });
  } catch {
    return err("Could not activate your plan. Please try again.");
  }
}

interface InvoiceRow {
  id: string;
  number: string;
  planKey: string;
  planName: string;
  billingInterval: string;
  amountTzs: number | { toNumber(): number };
  currency: string;
  status: string;
  issuedAt: Date;
  dueAt: Date;
  submittedAt: Date | null;
  paidAt: Date | null;
  billToCompany: string;
  billToEmail: string;
  billToName: string;
}

function toView(r: InvoiceRow): SubscriptionInvoiceView {
  return {
    id: r.id,
    number: r.number,
    planKey: r.planKey,
    planName: r.planName,
    billingInterval: r.billingInterval,
    amountTzs: decToNum(r.amountTzs),
    currency: r.currency,
    status: r.status as SubscriptionInvoiceStatus,
    issuedAt: iso(r.issuedAt),
    dueAt: iso(r.dueAt),
    submittedAt: r.submittedAt ? iso(r.submittedAt) : null,
    paidAt: r.paidAt ? iso(r.paidAt) : null,
    billToCompany: r.billToCompany,
    billToEmail: r.billToEmail,
    billToName: r.billToName,
  };
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

function isUniqueClash(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}

/**
 * Generates a bank-transfer subscription invoice for the chosen plan (unpaid, due in 24h) and
 * supersedes any earlier unpaid invoice for this tenant. Does NOT grant the tier — access is
 * granted only when a super-admin approves the invoice.
 */
export async function createSubscriptionInvoice(input: unknown): Promise<Result<SubscriptionInvoiceView>> {
  const parsed = createSubscriptionInvoiceSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid plan");
  const { planKey } = parsed.data;

  return withAuth(async (ctx) => {
    const plan = await authDb.plan.findUnique({ where: { key: planKey } });
    const fallback = PLANS.find((p) => p.id === planKey);
    const amount = plan ? decToNum(plan.priceTzs) : fallback?.priceTzs ?? 0;
    const planName = plan?.name ?? fallback?.name ?? planKey;
    const interval = plan?.interval ?? "year";
    if (!amount) return err("The selected plan is unavailable. Please try another.");

    // Supersede any earlier unpaid invoice — only the latest selection should be payable.
    await authDb.subscriptionInvoice.updateMany({
      where: { tenantId: ctx.tenantId, status: "unpaid" },
      data: { status: "cancelled" },
    });

    const [profile, user, tenant] = await Promise.all([
      authDb.companyProfile.findFirst({ where: { tenantId: ctx.tenantId }, select: { name: true, email: true } }),
      authDb.user.findUnique({ where: { id: ctx.userId }, select: { name: true, email: true } }),
      authDb.tenant.findUnique({ where: { id: ctx.tenantId }, select: { name: true } }),
    ]);
    const billToCompany = (profile?.name || tenant?.name || "—").trim();
    const billToEmail = (profile?.email || user?.email || "").trim();
    const billToName = (user?.name ?? "").trim();

    const now = new Date();
    const dueAt = new Date(now.getTime() + INVOICE_DUE_HOURS * 60 * 60 * 1000);
    const year = now.getFullYear();
    const base = (await authDb.subscriptionInvoice.count()) + 1;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const seq = base + attempt;
      const number = `SUB-${year}-${String(seq).padStart(5, "0")}`;
      try {
        const created = await authDb.subscriptionInvoice.create({
          data: {
            number,
            tenantId: ctx.tenantId,
            userId: ctx.userId,
            planKey,
            planName,
            billingInterval: interval,
            amountTzs: amount,
            dueAt,
            billToCompany,
            billToEmail,
            billToName,
          },
        });
        return ok(toView(created));
      } catch (e) {
        if (isUniqueClash(e)) continue;
        throw e;
      }
    }
    return err("Could not generate the invoice. Please try again.");
  });
}

/**
 * Finalizes the invoice: marks the tenant "pending approval", emails the branded invoice PDF, and
 * leaves the invoice unpaid until the admin confirms the bank transfer.
 */
export async function submitSubscriptionInvoice(input: unknown): Promise<Result<true>> {
  const parsed = subscriptionInvoiceIdSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { invoiceId } = parsed.data;

  return withAuth(async (ctx) => {
    const inv = await authDb.subscriptionInvoice.findUnique({ where: { id: invoiceId } });
    if (!inv || inv.tenantId !== ctx.tenantId) return err("Invoice not found");
    if (inv.status !== "unpaid") return err("This invoice can no longer be submitted.");

    await authDb.subscriptionInvoice.update({ where: { id: inv.id }, data: { submittedAt: new Date() } });
    await authDb.tenant.update({ where: { id: ctx.tenantId }, data: { status: "pending_approval" } });

    // Alert platform admins that a bank-transfer payment now awaits their approval.
    try {
      const amount = decToNum(inv.amountTzs);
      const admins = await notifySuperAdmins({
        type: "payment",
        title: "Payment awaiting approval",
        body: `${inv.billToCompany} submitted payment for invoice ${inv.number} (TZS ${amount.toLocaleString()}).`,
        link: "/admin/subscription-invoices",
      });
      const { html, text } = paymentSubmittedAdminEmail({ tenantName: inv.billToCompany, invoiceNumber: inv.number, amountTzs: amount, reviewUrl: `${appUrl()}/admin/subscription-invoices` });
      await Promise.all(admins.filter((a) => a.email).map((a) => sendMail({ to: a.email, subject: `Payment awaiting approval — ${inv.billToCompany}`, html, text })));
    } catch (e) {
      console.error("[billing] admin payment-submitted notify failed:", e);
    }

    // Email the invoice with the PDF attached — best-effort (never block the flow).
    const view = toView(inv);
    if (view.billToEmail) {
      try {
        const pdf = await renderSubscriptionInvoicePdf(view);
        const { html, text } = subscriptionInvoiceEmail({ invoice: view, invoiceUrl: `${appUrl()}/pending-approval` });
        await sendMail({
          to: view.billToEmail,
          subject: `Invoice ${view.number} — Uhasibu Digito subscription`,
          html,
          text,
          attachments: [{ filename: `${view.number}.pdf`, content: pdf, contentType: "application/pdf" }],
        });
      } catch (e) {
        console.error("[billing] failed to email subscription invoice:", e);
      }
    }
    return ok(true);
  });
}

/** The tenant's latest subscription invoice (drives the payment step + pending-approval screen). */
export async function getMySubscriptionInvoice(): Promise<Result<SubscriptionInvoiceView | null>> {
  return withAuth(async (ctx) => {
    const inv = await authDb.subscriptionInvoice.findFirst({
      where: { tenantId: ctx.tenantId },
      orderBy: { createdAt: "desc" },
    });
    return ok(inv ? toView(inv) : null);
  });
}
