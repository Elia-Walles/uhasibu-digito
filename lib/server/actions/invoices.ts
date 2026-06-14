"use server";
import type { Invoice as DbInvoice, InvoiceLine as DbInvoiceLine, SendLogEntry as DbSendLog } from "@prisma/client";
import { db } from "@/lib/server/db";
import { sendMail } from "@/lib/server/email";
import { withAuth } from "@/lib/server/with-auth";
import {
  createInvoiceSchema,
  updateInvoiceStatusSchema,
  sendInvoiceSchema,
} from "@/lib/server/schemas/invoices";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum, dateOnly, iso } from "@/lib/server/serialize";
import { computeInvoiceTotals } from "@/lib/utils/invoice-totals";
import type { Invoice, InvoiceLine, InvoiceStatus, SendLogEntry, SendStatus } from "@/types";

type DbInvoiceWithLines = DbInvoice & { lines: DbInvoiceLine[] };

function rowToLine(l: DbInvoiceLine): InvoiceLine {
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

function rowToInvoice(r: DbInvoiceWithLines): Invoice {
  return {
    id: r.id,
    number: r.number,
    customerId: r.customerId,
    customerName: r.customerName,
    issueDate: dateOnly(r.issueDate),
    dueDate: dateOnly(r.dueDate),
    lines: r.lines.map(rowToLine),
    subtotal: decToNum(r.subtotal),
    discount: decToNum(r.discount),
    vatAmount: decToNum(r.vatAmount),
    total: decToNum(r.total),
    status: r.status as InvoiceStatus,
    efdNumber: r.efdNumber,
    notes: r.notes,
    ...(r.paidAt ? { paidAt: iso(r.paidAt) } : {}),
  };
}

function rowToSendLog(r: DbSendLog): SendLogEntry {
  return {
    id: r.id,
    invoiceId: r.invoiceId,
    invoiceNumber: r.invoiceNumber,
    customerName: r.customerName,
    channel: r.channel as SendLogEntry["channel"],
    recipient: r.recipient,
    sentAt: iso(r.sentAt),
    status: r.status as SendStatus,
  };
}

export async function listInvoices(): Promise<Invoice[]> {
  return withAuth(async () => {
    const rows = await db.invoice.findMany({
      orderBy: [{ createdAt: "desc" }, { number: "desc" }],
      include: { lines: true },
    });
    return rows.map(rowToInvoice);
  });
}

export async function listSendLog(): Promise<SendLogEntry[]> {
  return withAuth(async () => {
    const rows = await db.sendLogEntry.findMany({ orderBy: { sentAt: "desc" } });
    return rows.map(rowToSendLog);
  });
}

export async function createInvoice(input: unknown): Promise<Result<Invoice>> {
  const parsed = createInvoiceSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  return withAuth(async (ctx) => {
    const customer = await db.customer.findFirst({ where: { id: d.customerId } });
    if (!customer) return err("Customer not found");

    const { lineTotals, subtotal, vatAmount, total } = computeInvoiceTotals(d.lines);
    const year = new Date(d.issueDate).getFullYear();
    const baseSeq = (await db.invoice.count()) + 1;

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
        const created = await db.invoice.create({
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
            status: d.status,
            efdNumber,
            notes: d.notes,
            ...(d.status === "Paid" ? { paidAt: d.paidAt ? new Date(d.paidAt) : new Date() } : {}),
            lines: { create: lineData },
          },
          include: { lines: true },
        });
        return ok(rowToInvoice(created));
      } catch (e: unknown) {
        if ((e as { code?: string }).code === "P2002") continue;
        throw e;
      }
    }
    return err("Could not allocate an invoice number please retry");
  });
}

export async function updateInvoiceStatus(input: unknown): Promise<Result<Invoice>> {
  const parsed = updateInvoiceStatusSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, status } = parsed.data;
  return withAuth(async () => {
    try {
      const updated = await db.invoice.update({
        where: { id },
        data: { status, ...(status === "Paid" ? { paidAt: new Date() } : {}) },
        include: { lines: true },
      });
      return ok(rowToInvoice(updated));
    } catch {
      return err("Invoice not found");
    }
  });
}

export async function sendInvoice(input: unknown): Promise<Result<SendLogEntry>> {
  const parsed = sendInvoiceSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { invoiceId, channel, recipient } = parsed.data;

  return withAuth(async (ctx) => {
    const invoice = await db.invoice.findFirst({ where: { id: invoiceId } });
    if (!invoice) return err("Invoice not found");

    let status: SendStatus = "Queued";
    if (channel === "Email" || channel === "Both") {
      const delivered = await sendMail({
        to: recipient || invoice.customerName,
        subject: `Invoice ${invoice.number}`,
        html: `<p>Dear ${invoice.customerName},</p><p>Please find invoice <strong>${invoice.number}</strong>. Total due: TZS ${decToNum(invoice.total).toLocaleString()}.</p><p>Thank you for your business.</p>`,
      });
      status = delivered ? "Delivered" : "Failed";
    }
    // WhatsApp-only sends remain "Queued" no WhatsApp provider is wired yet.

    const entry = await db.sendLogEntry.create({
      data: {
        tenantId: ctx.tenantId,
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        customerName: invoice.customerName,
        channel,
        recipient,
        status,
      },
    });
    return ok(rowToSendLog(entry));
  });
}
