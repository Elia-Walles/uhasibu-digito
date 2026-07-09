"use server";
import type { Quotation as DbQuotation, QuotationLine as DbQuotationLine } from "@prisma/client";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import { createQuotationSchema, updateQuotationStatusSchema, convertQuotationSchema } from "@/lib/server/schemas/quotations";
import { createInvoice } from "@/lib/server/actions/invoices";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum, dateOnly } from "@/lib/server/serialize";
import { computeInvoiceTotals } from "@/lib/utils/invoice-totals";
import type { Quotation, Invoice, InvoiceLine, QuotationStatus } from "@/types";

type DbQuotationWithLines = DbQuotation & { lines: DbQuotationLine[] };

function rowToLine(l: DbQuotationLine): InvoiceLine {
  return {
    id: l.id,
    description: l.description,
    quantity: decToNum(l.quantity),
    unitPrice: decToNum(l.unitPrice),
    discountPct: decToNum(l.discountPct),
    vatPct: decToNum(l.vatPct),
    lineTotal: decToNum(l.lineTotal),
  };
}

function rowToQuotation(r: DbQuotationWithLines): Quotation {
  return {
    id: r.id,
    number: r.number,
    customerId: r.customerId,
    customerName: r.customerName,
    date: dateOnly(r.date),
    validUntil: dateOnly(r.validUntil),
    lines: r.lines.map(rowToLine),
    subtotal: decToNum(r.subtotal),
    vatAmount: decToNum(r.vatAmount),
    total: decToNum(r.total),
    status: r.status as QuotationStatus,
    ...(r.notes !== null ? { notes: r.notes } : {}),
    ...(r.convertedInvoiceId !== null ? { convertedInvoiceId: r.convertedInvoiceId } : {}),
  };
}

export async function listQuotations(): Promise<Quotation[]> {
  return withAuth(async () => {
    const rows = await db.quotation.findMany({
      orderBy: [{ createdAt: "desc" }, { number: "desc" }],
      include: { lines: true },
    });
    return rows.map(rowToQuotation);
  });
}

export async function createQuotation(input: unknown): Promise<Result<Quotation>> {
  const parsed = createQuotationSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  return withAuth(async (ctx) => {
    const customer = await db.customer.findFirst({ where: { id: d.customerId } });
    if (!customer) return err("Customer not found");

    const { lineTotals, subtotal, vatAmount, total } = computeInvoiceTotals(d.lines);
    const year = new Date(d.date).getFullYear();
    const baseSeq = (await db.quotation.count()) + 1;
    const lineData = d.lines.map((l, i) => ({
      tenantId: ctx.tenantId,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPct: l.discountPct,
      vatPct: l.vatPct,
      lineTotal: lineTotals[i] ?? 0,
    }));

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const seq = baseSeq + attempt;
      const number = `QUO-${year}-${String(seq).padStart(5, "0")}`;
      try {
        const created = await db.quotation.create({
          data: {
            tenantId: ctx.tenantId,
            number,
            customerId: customer.id,
            customerName: customer.name,
            date: new Date(d.date),
            validUntil: new Date(d.validUntil),
            subtotal,
            vatAmount,
            total,
            status: d.status,
            notes: d.notes,
            lines: { create: lineData },
          },
          include: { lines: true },
        });
        return ok(rowToQuotation(created));
      } catch (e: unknown) {
        if ((e as { code?: string }).code === "P2002") continue;
        throw e;
      }
    }
    return err("Could not allocate a quotation number please retry");
  });
}

export async function updateQuotationStatus(input: unknown): Promise<Result<Quotation>> {
  const parsed = updateQuotationStatusSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, status } = parsed.data;

  return withAuth(async () => {
    const existing = await db.quotation.findFirst({ where: { id } });
    if (!existing) return err("Quotation not found");
    if (existing.status === "Converted") return err("A converted quotation can't change status");
    const updated = await db.quotation.update({
      where: { id },
      data: { status },
      include: { lines: true },
    });
    return ok(rowToQuotation(updated));
  });
}

/**
 * Convert a quotation into an issued (Sent) invoice atomically: createInvoice carries the lines,
 * marks the quotation Converted and links both sides inside a single transaction, so there is no
 * window where an invoice exists but the quotation is still open, and re-conversion is rejected.
 */
export async function convertQuotation(input: unknown): Promise<Result<Invoice>> {
  const parsed = convertQuotationSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { quotationId } = parsed.data;

  return withAuth(async () => {
    const q = await db.quotation.findFirst({ where: { id: quotationId }, include: { lines: true } });
    if (!q) return err("Quotation not found");
    if (q.status === "Converted") return err("This quotation was already converted to an invoice");

    const issueDate = dateOnly(new Date());
    const dueDate = dateOnly(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    return createInvoice({
      customerId: q.customerId,
      issueDate,
      dueDate,
      status: "Sent",
      notes: q.notes ? `Converted from quotation ${q.number} · ${q.notes}` : `Converted from quotation ${q.number}`,
      quotationId: q.id,
      lines: q.lines.map((l) => ({
        description: l.description,
        quantity: decToNum(l.quantity),
        unitPrice: decToNum(l.unitPrice),
        discountPct: decToNum(l.discountPct),
        vatPct: decToNum(l.vatPct),
      })),
    });
  });
}
