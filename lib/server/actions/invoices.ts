"use server";
import { randomUUID } from "node:crypto";
import type { Invoice as DbInvoice, InvoiceLine as DbInvoiceLine, SendLogEntry as DbSendLog, InvoicePayment as DbPayment } from "@prisma/client";
import { db } from "@/lib/server/db";
import { sendMail } from "@/lib/server/email";
import { withAuth } from "@/lib/server/with-auth";
import { reverseJournalEntry } from "@/lib/server/journal-posting";
import { postInvoiceIssued, postInvoicePayment } from "@/lib/server/gl-postings";
import { postOutputVat, reverseOutputVat } from "@/lib/server/pos-posting";
import { createInvoiceCore } from "@/lib/server/invoice-create";
import { canPostFinancials } from "@/lib/auth/roles";
import { notifyTenantOwner } from "@/lib/server/notify";
import {
  createInvoiceSchema,
  updateInvoiceStatusSchema,
  updateInvoiceFullSchema,
  recordInvoicePaymentSchema,
  sendInvoiceSchema,
} from "@/lib/server/schemas/invoices";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum, dateOnly, iso } from "@/lib/server/serialize";
import { computeInvoiceTotals } from "@/lib/utils/invoice-totals";
import type { Invoice, InvoiceLine, InvoiceStatus, InvoicePayment, SendLogEntry, SendStatus } from "@/types";

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
    amountPaid: decToNum(r.amountPaid),
    status: r.status as InvoiceStatus,
    efdNumber: r.efdNumber,
    notes: r.notes,
    ...(r.publicToken ? { publicToken: r.publicToken } : {}),
    ...(r.paidAt ? { paidAt: iso(r.paidAt) } : {}),
  };
}

function rowToPayment(r: DbPayment): InvoicePayment {
  return {
    id: r.id,
    invoiceId: r.invoiceId,
    invoiceNumber: r.invoiceNumber,
    customerId: r.customerId,
    customerName: r.customerName,
    amount: decToNum(r.amount),
    method: r.method,
    reference: r.reference,
    paidAt: iso(r.paidAt),
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

/**
 * Best-effort: email the customer a branded payment receipt and post an in-app notification to the
 * tenant owner. Never throws — a notification failure must not fail the payment.
 */
async function sendPaymentReceipt(inv: DbInvoiceWithLines, paymentAmount: number, tenantId: string): Promise<void> {
  try {
    const [customer, company] = await Promise.all([
      db.customer.findFirst({ where: { id: inv.customerId }, select: { email: true } }),
      db.companyProfile.findFirst({ select: { name: true } }),
    ]);
    const balanceDue = decToNum(inv.total) - decToNum(inv.amountPaid);
    const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "";
    const link = inv.publicToken ? `${base}/invoice/${inv.publicToken}` : undefined;
    if (customer?.email) {
      const { paymentReceiptEmail } = await import("@/lib/server/email-templates");
      const { html, text } = paymentReceiptEmail({
        invoiceNumber: inv.number,
        amountPaid: paymentAmount,
        balanceDue,
        companyName: company?.name ?? "Your supplier",
        ...(link ? { publicLink: link } : {}),
      });
      await sendMail({ to: customer.email, subject: `Payment received — invoice ${inv.number}`, html, text });
    }
    await notifyTenantOwner(tenantId, {
      type: "payment",
      title: "Payment received",
      body: `TZS ${paymentAmount.toLocaleString()} recorded on invoice ${inv.number} from ${inv.customerName}.`,
      link: "/sales/payments",
    });
  } catch (e) {
    console.error("[invoices] payment receipt/notify failed:", e);
  }
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

export async function listInvoicePayments(): Promise<InvoicePayment[]> {
  return withAuth(async () => {
    const rows = await db.invoicePayment.findMany({ orderBy: { paidAt: "desc" } });
    return rows.map(rowToPayment);
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
    // Anyone may draft; only post-roles may issue (Sent/Paid posts to the ledger).
    if (d.status !== "Draft" && !canPostFinancials(ctx.role)) return err("Your role can't issue invoices — save it as a draft instead");
    const res = await createInvoiceCore(ctx, d);
    return res.ok ? ok(rowToInvoice(res.data)) : res;
  });
}

/** Edit a Draft invoice's content (customer, dates, lines). Drafts only — issued invoices are immutable. */
export async function updateInvoiceFull(input: unknown): Promise<Result<Invoice>> {
  const parsed = updateInvoiceFullSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  return withAuth(async (ctx) => {
    const invoice = await db.invoice.findFirst({ where: { id: d.id } });
    if (!invoice) return err("Invoice not found");
    if (invoice.status !== "Draft") return err("Only draft invoices can be edited");
    const customer = await db.customer.findFirst({ where: { id: d.customerId } });
    if (!customer) return err("Customer not found");

    const { lineTotals, subtotal, vatAmount, total } = computeInvoiceTotals(d.lines);
    const updated = await db.$transaction(async (tx) => {
      await tx.invoiceLine.deleteMany({ where: { invoiceId: d.id } });
      return tx.invoice.update({
        where: { id: d.id },
        data: {
          customerId: customer.id,
          customerName: customer.name,
          issueDate: new Date(d.issueDate),
          dueDate: new Date(d.dueDate),
          notes: d.notes,
          subtotal,
          vatAmount,
          total,
          lines: {
            create: d.lines.map((l, i) => ({
              tenantId: ctx.tenantId,
              description: l.description,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              discountPct: l.discountPct,
              vatPct: l.vatPct,
              lineTotal: lineTotals[i] ?? 0,
            })),
          },
        },
        include: { lines: true },
      });
    });
    return ok(rowToInvoice(updated));
  });
}

export async function updateInvoiceStatus(input: unknown): Promise<Result<Invoice>> {
  const parsed = updateInvoiceStatusSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, status } = parsed.data;
  return withAuth(async (ctx) => {
    const invoice = await db.invoice.findFirst({ where: { id }, include: { lines: true } });
    if (!invoice) return err("Invoice not found");

    const net = decToNum(invoice.subtotal);
    const vat = decToNum(invoice.vatAmount);
    const total = decToNum(invoice.total);

    await db.$transaction(async (tx) => {
      if (status === "Sent" && invoice.status === "Draft") {
        if (!invoice.journalRef) {
          await postInvoiceIssued(tx, ctx.tenantId, ctx, { invoiceNumber: invoice.number, date: dateOnly(invoice.issueDate), net, vat });
          await postOutputVat(tx, ctx.tenantId, { date: dateOnly(invoice.issueDate), reference: invoice.number, description: `Invoice ${invoice.number}`, net, vat });
          await tx.customer.update({
            where: { id: invoice.customerId },
            data: { outstandingBalance: { increment: total }, totalRevenue: { increment: net } },
          });
          await tx.invoice.update({ where: { id }, data: { status, journalRef: invoice.number, ...(invoice.publicToken ? {} : { publicToken: randomUUID() }) } });
        } else {
          await tx.invoice.update({ where: { id }, data: { status } });
        }
      } else if (status === "Cancelled") {
        if (invoice.journalRef) {
          await reverseJournalEntry(tx, ctx.tenantId, invoice.journalRef);
          await reverseOutputVat(tx, ctx.tenantId, { date: dateOnly(invoice.issueDate), reference: invoice.number, description: `Invoice ${invoice.number}`, net, vat });
        }
        const pays = await tx.invoicePayment.findMany({ where: { invoiceId: id } });
        for (const p of pays) if (p.journalRef) await reverseJournalEntry(tx, ctx.tenantId, p.journalRef);
        if (invoice.journalRef) {
          const remaining = total - decToNum(invoice.amountPaid);
          await tx.customer.update({
            where: { id: invoice.customerId },
            data: { outstandingBalance: { decrement: remaining }, totalRevenue: { decrement: net } },
          });
        }
        await tx.invoicePayment.deleteMany({ where: { invoiceId: id } });
        await tx.invoice.update({ where: { id }, data: { status: "Cancelled", amountPaid: 0, paidAt: null } });
      } else if (status === "Paid") {
        const remaining = total - decToNum(invoice.amountPaid);
        if (invoice.journalRef && remaining > 0) {
          const count = await tx.invoicePayment.count({ where: { invoiceId: id } });
          const payRef = `${invoice.number}-PMT-${count + 1}`;
          const payDate = dateOnly(new Date());
          await postInvoicePayment(tx, ctx.tenantId, ctx, { invoiceNumber: invoice.number, reference: payRef, date: payDate, amount: remaining, method: "Bank Transfer" });
          await tx.invoicePayment.create({
            data: {
              tenantId: ctx.tenantId, invoiceId: id, invoiceNumber: invoice.number,
              customerId: invoice.customerId, customerName: invoice.customerName,
              amount: remaining, method: "Bank Transfer", reference: "", paidAt: new Date(), journalRef: payRef,
            },
          });
          await tx.customer.update({ where: { id: invoice.customerId }, data: { outstandingBalance: { decrement: remaining } } });
        }
        await tx.invoice.update({ where: { id }, data: { status: "Paid", amountPaid: total, paidAt: new Date() } });
      } else {
        await tx.invoice.update({ where: { id }, data: { status } });
      }
    });

    const refreshed = await db.invoice.findFirstOrThrow({ where: { id }, include: { lines: true } });
    if (status === "Paid") {
      const newlyPaid = decToNum(refreshed.amountPaid) - decToNum(invoice.amountPaid);
      if (newlyPaid > 0.01) await sendPaymentReceipt(refreshed, newlyPaid, ctx.tenantId);
    }
    return ok(rowToInvoice(refreshed));
  });
}

/** Record a (partial or full) payment against an issued invoice; posts Dr Cash / Cr Receivables. */
export async function recordInvoicePayment(input: unknown): Promise<Result<Invoice>> {
  const parsed = recordInvoicePaymentSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  return withAuth(async (ctx) => {
    const invoice = await db.invoice.findFirst({ where: { id: d.invoiceId } });
    if (!invoice) return err("Invoice not found");
    if (invoice.status === "Cancelled") return err("This invoice was cancelled");
    if (!invoice.journalRef) return err("Issue the invoice (mark it sent) before recording a payment");
    const total = decToNum(invoice.total);
    const remaining = total - decToNum(invoice.amountPaid);
    if (remaining <= 0) return err("This invoice is already fully paid");
    const amount = Math.min(d.amount, remaining);
    const payDate = d.paidAt ? d.paidAt : dateOnly(new Date());

    await db.$transaction(async (tx) => {
      const count = await tx.invoicePayment.count({ where: { invoiceId: invoice.id } });
      const payRef = `${invoice.number}-PMT-${count + 1}`;
      await postInvoicePayment(tx, ctx.tenantId, ctx, { invoiceNumber: invoice.number, reference: payRef, date: payDate, amount, method: d.method });
      await tx.invoicePayment.create({
        data: {
          tenantId: ctx.tenantId, invoiceId: invoice.id, invoiceNumber: invoice.number,
          customerId: invoice.customerId, customerName: invoice.customerName,
          amount, method: d.method, reference: d.reference, paidAt: new Date(payDate), journalRef: payRef,
        },
      });
      const newPaid = decToNum(invoice.amountPaid) + amount;
      const fullyPaid = newPaid >= total - 0.01;
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { amountPaid: newPaid, ...(fullyPaid ? { status: "Paid", paidAt: new Date() } : {}) },
      });
      await tx.customer.update({ where: { id: invoice.customerId }, data: { outstandingBalance: { decrement: amount } } });
    });

    const refreshed = await db.invoice.findFirstOrThrow({ where: { id: invoice.id }, include: { lines: true } });
    await sendPaymentReceipt(refreshed, amount, ctx.tenantId);
    return ok(rowToInvoice(refreshed));
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
      // Render the branded PDF (with EFD QR) as an attachment and include the public link.
      const { loadInvoiceForPdf } = await import("@/lib/server/invoice-pdf-data");
      const { renderInvoicePdf } = await import("@/lib/server/invoice-pdf");
      const loaded = await loadInvoiceForPdf({ id: invoice.id });
      const attachments = loaded
        ? [{ filename: `${invoice.number}.pdf`, content: await renderInvoicePdf(loaded.data), contentType: "application/pdf" }]
        : undefined;
      const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "";
      const link = invoice.publicToken ? `${base}/invoice/${invoice.publicToken}` : "";
      const { invoiceEmail } = await import("@/lib/server/email-templates");
      const { html, text } = invoiceEmail({ customerName: invoice.customerName, invoiceNumber: invoice.number, total: decToNum(invoice.total), ...(link ? { publicLink: link } : {}) });
      const delivered = await sendMail({
        to: recipient || invoice.customerName,
        subject: `Invoice ${invoice.number}`,
        html,
        text,
        ...(attachments ? { attachments } : {}),
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
