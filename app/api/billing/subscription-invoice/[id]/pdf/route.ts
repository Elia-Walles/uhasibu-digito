import { auth } from "@/auth";
import { authDb } from "@/lib/server/auth-db";
import { renderSubscriptionInvoicePdf } from "@/lib/server/subscription-invoice-pdf";
import { decToNum, iso } from "@/lib/server/serialize";
import type { SubscriptionInvoiceView, SubscriptionInvoiceStatus } from "@/types/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Streams the branded subscription-invoice PDF. Access: the owning tenant, or any super-admin.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const inv = await authDb.subscriptionInvoice.findUnique({ where: { id } });
  if (!inv) return new Response("Not found", { status: 404 });

  const isOwner = inv.tenantId === session.user.tenantId;
  const isSuper = session.user.isSuperAdmin === true;
  if (!isOwner && !isSuper) return new Response("Forbidden", { status: 403 });

  const view: SubscriptionInvoiceView = {
    id: inv.id,
    number: inv.number,
    planKey: inv.planKey,
    planName: inv.planName,
    billingInterval: inv.billingInterval,
    amountTzs: decToNum(inv.amountTzs),
    currency: inv.currency,
    status: inv.status as SubscriptionInvoiceStatus,
    issuedAt: iso(inv.issuedAt),
    dueAt: iso(inv.dueAt),
    submittedAt: inv.submittedAt ? iso(inv.submittedAt) : null,
    paidAt: inv.paidAt ? iso(inv.paidAt) : null,
    billToCompany: inv.billToCompany,
    billToEmail: inv.billToEmail,
    billToName: inv.billToName,
  };

  const pdf = await renderSubscriptionInvoicePdf(view);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${inv.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
