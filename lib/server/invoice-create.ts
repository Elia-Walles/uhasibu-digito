import { randomUUID } from "node:crypto";
import type { Invoice as DbInvoice, InvoiceLine as DbInvoiceLine } from "@prisma/client";
import { db } from "@/lib/server/db";
import type { RequestContext } from "@/lib/server/request-context";
import { postInvoiceIssued, postInvoicePayment } from "@/lib/server/gl-postings";
import { postOutputVat } from "@/lib/server/pos-posting";
import { ok, err, type Result } from "@/lib/server/result";
import { computeInvoiceTotals } from "@/lib/utils/invoice-totals";
import type { CreateInvoiceInput } from "@/lib/server/schemas/invoices";

export type DbInvoiceWithLines = DbInvoice & { lines: DbInvoiceLine[] };

/** Thrown inside the create transaction when a quotation was converted concurrently (rolls back). */
class QuotationConflict extends Error {}

/**
 * Core invoice creation shared by the `createInvoice` server action and the recurring-invoice engine
 * (manual "Generate now" + the cron). It assumes a RequestContext is ALREADY bound — by `withAuth`
 * for the action or `runWithContext` for the cron — so the scoped `db` injects the tenant; it never
 * reads the session itself, which is what lets the unauthenticated cron reuse it. Returns the raw
 * created row so callers map it with their own `rowToInvoice`.
 */
export async function createInvoiceCore(ctx: RequestContext, d: CreateInvoiceInput): Promise<Result<DbInvoiceWithLines>> {
  const customer = await db.customer.findFirst({ where: { id: d.customerId } });
  if (!customer) return err("Customer not found");

  // Converting a quotation: fail fast if it's already converted (also re-checked atomically below).
  if (d.quotationId) {
    const q = await db.quotation.findFirst({ where: { id: d.quotationId } });
    if (!q) return err("Quotation not found");
    if (q.status === "Converted") return err("This quotation was already converted to an invoice");
  }

  const { lineTotals, subtotal, vatAmount, total } = computeInvoiceTotals(d.lines);
  const year = new Date(d.issueDate).getFullYear();
  const baseSeq = (await db.invoice.count()) + 1;
  const issued = d.status !== "Draft";

  const lineData = d.lines.map((l, i) => ({
    tenantId: ctx.tenantId,
    description: l.description,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    discountPct: l.discountPct,
    vatPct: l.vatPct,
    lineTotal: lineTotals[i] ?? 0,
  }));

  // Retry on the @@unique([tenantId, number]) clash (concurrent creates).
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const seq = baseSeq + attempt;
    const number = `INV-${year}-${String(seq).padStart(5, "0")}`;
    const efdNumber = `EFD-${year}-${String(seq).padStart(8, "0")}`;
    try {
      const created = await db.$transaction(async (tx) => {
        const inv = await tx.invoice.create({
          data: {
            tenantId: ctx.tenantId,
            number,
            customerId: customer.id,
            customerName: customer.name,
            issueDate: new Date(d.issueDate),
            dueDate: new Date(d.dueDate),
            subtotal,
            discount: 0,
            vatAmount,
            total,
            amountPaid: d.status === "Paid" ? total : 0,
            status: d.status,
            efdNumber,
            journalRef: issued ? number : "",
            // Issued invoices get an unguessable public-link token immediately.
            ...(issued ? { publicToken: randomUUID() } : {}),
            ...(d.quotationId ? { quotationId: d.quotationId } : {}),
            notes: d.notes,
            ...(d.status === "Paid" ? { paidAt: d.paidAt ? new Date(d.paidAt) : new Date() } : {}),
            lines: { create: lineData },
          },
          include: { lines: true },
        });

        // Mark the source quotation Converted in the same transaction; the guard makes re-conversion a no-op.
        if (d.quotationId) {
          const upd = await tx.quotation.updateMany({
            where: { id: d.quotationId, status: { not: "Converted" } },
            data: { status: "Converted", convertedInvoiceId: inv.id },
          });
          if (upd.count === 0) throw new QuotationConflict();
        }

        if (issued) {
          await postInvoiceIssued(tx, ctx.tenantId, ctx, { invoiceNumber: number, date: d.issueDate, net: subtotal, vat: vatAmount });
          await postOutputVat(tx, ctx.tenantId, { date: d.issueDate, reference: number, description: `Invoice ${number}`, net: subtotal, vat: vatAmount });
          await tx.customer.update({
            where: { id: customer.id },
            data: { outstandingBalance: { increment: total }, totalRevenue: { increment: subtotal } },
          });
        }
        if (d.status === "Paid") {
          const payRef = `${number}-PMT-1`;
          const payDate = d.paidAt ? d.paidAt.split("T")[0]! : d.issueDate;
          await postInvoicePayment(tx, ctx.tenantId, ctx, { invoiceNumber: number, reference: payRef, date: payDate, amount: total, method: "Cash" });
          await tx.invoicePayment.create({
            data: {
              tenantId: ctx.tenantId, invoiceId: inv.id, invoiceNumber: number,
              customerId: customer.id, customerName: customer.name,
              amount: total, method: "Cash", reference: "", paidAt: new Date(payDate), journalRef: payRef,
            },
          });
          await tx.customer.update({ where: { id: customer.id }, data: { outstandingBalance: { decrement: total } } });
        }
        return inv;
      });
      return ok(created);
    } catch (e: unknown) {
      if (e instanceof QuotationConflict) return err("This quotation was already converted to an invoice");
      if ((e as { code?: string }).code === "P2002") continue;
      throw e;
    }
  }
  return err("Could not allocate an invoice number please retry");
}
