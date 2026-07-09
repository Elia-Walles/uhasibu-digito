"use server";
import type { RecurringInvoice as DbRecurring, RecurringInvoiceLine as DbRecurringLine, Prisma } from "@prisma/client";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import { generateDueRecurring } from "@/lib/server/recurring-run";
import {
  createRecurringInvoiceSchema,
  updateRecurringInvoiceSchema,
  recurringIdSchema,
} from "@/lib/server/schemas/recurring-invoices";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum, dateOnly } from "@/lib/server/serialize";
import { computeInvoiceTotals } from "@/lib/utils/invoice-totals";
import type { RecurringInvoice, RecurringFrequency, InvoiceLine } from "@/types";

type DbRecurringWithLines = DbRecurring & { lines: DbRecurringLine[] };

function rowToLine(l: DbRecurringLine): InvoiceLine {
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

function rowToRecurring(r: DbRecurringWithLines): RecurringInvoice {
  return {
    id: r.id,
    customerId: r.customerId,
    customerName: r.customerName,
    frequency: r.frequency as RecurringFrequency,
    interval: r.interval,
    nextRunAt: dateOnly(r.nextRunAt),
    startDate: dateOnly(r.startDate),
    ...(r.endDate ? { endDate: dateOnly(r.endDate) } : {}),
    active: r.active,
    notes: r.notes,
    ...(r.lastInvoiceId ? { lastInvoiceId: r.lastInvoiceId } : {}),
    lines: r.lines.map(rowToLine),
  };
}

export async function listRecurringInvoices(): Promise<RecurringInvoice[]> {
  return withAuth(async () => {
    const rows = await db.recurringInvoice.findMany({ orderBy: { createdAt: "desc" }, include: { lines: true } });
    return rows.map(rowToRecurring);
  });
}

export async function createRecurringInvoice(input: unknown): Promise<Result<RecurringInvoice>> {
  const parsed = createRecurringInvoiceSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  return withAuth(async (ctx) => {
    const customer = await db.customer.findFirst({ where: { id: d.customerId } });
    if (!customer) return err("Customer not found");

    const { lineTotals } = computeInvoiceTotals(d.lines);
    const created = await db.recurringInvoice.create({
      data: {
        tenantId: ctx.tenantId,
        customerId: customer.id,
        customerName: customer.name,
        frequency: d.frequency,
        interval: d.interval,
        startDate: new Date(d.startDate),
        nextRunAt: new Date(d.startDate), // first run on the start date
        ...(d.endDate ? { endDate: new Date(d.endDate) } : {}),
        active: d.active,
        notes: d.notes,
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
    return ok(rowToRecurring(created));
  });
}

export async function updateRecurringInvoice(input: unknown): Promise<Result<RecurringInvoice>> {
  const parsed = updateRecurringInvoiceSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  return withAuth(async (ctx) => {
    const existing = await db.recurringInvoice.findFirst({ where: { id: d.id } });
    if (!existing) return err("Recurring invoice not found");

    const data: Prisma.RecurringInvoiceUpdateInput = {};
    if (d.customerId !== undefined) {
      const customer = await db.customer.findFirst({ where: { id: d.customerId } });
      if (!customer) return err("Customer not found");
      data.customerId = customer.id;
      data.customerName = customer.name;
    }
    if (d.frequency !== undefined) data.frequency = d.frequency;
    if (d.interval !== undefined) data.interval = d.interval;
    if (d.active !== undefined) data.active = d.active;
    if (d.notes !== undefined) data.notes = d.notes;
    if (d.endDate !== undefined) data.endDate = d.endDate ? new Date(d.endDate) : null;
    if (d.startDate !== undefined) {
      data.startDate = new Date(d.startDate);
      // Re-arm the first run when the schedule hasn't issued anything yet.
      if (!existing.lastInvoiceId) data.nextRunAt = new Date(d.startDate);
    }

    const updated = await db.$transaction(async (tx) => {
      if (d.lines) {
        const { lineTotals } = computeInvoiceTotals(d.lines);
        await tx.recurringInvoiceLine.deleteMany({ where: { recurringId: d.id } });
        data.lines = {
          create: d.lines.map((l, i) => ({
            tenantId: ctx.tenantId,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountPct: l.discountPct,
            vatPct: l.vatPct,
            lineTotal: lineTotals[i] ?? 0,
          })),
        };
      }
      return tx.recurringInvoice.update({ where: { id: d.id }, data, include: { lines: true } });
    });
    return ok(rowToRecurring(updated));
  });
}

export async function deleteRecurringInvoice(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = recurringIdSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id } = parsed.data;
  return withAuth(async () => {
    const existing = await db.recurringInvoice.findFirst({ where: { id } });
    if (!existing) return err("Recurring invoice not found");
    await db.$transaction(async (tx) => {
      await tx.recurringInvoiceLine.deleteMany({ where: { recurringId: id } });
      await tx.recurringInvoice.delete({ where: { id } });
    });
    return ok({ id });
  });
}

/** Issue an invoice from a template right now (the manual side of auto + manual). */
export async function generateRecurringInvoiceNow(input: unknown): Promise<Result<{ issued: number }>> {
  const parsed = recurringIdSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id } = parsed.data;
  return withAuth(async (ctx) => {
    const existing = await db.recurringInvoice.findFirst({ where: { id } });
    if (!existing) return err("Recurring invoice not found");
    if (!existing.active) return err("This template is paused — resume it first");
    const r = await generateDueRecurring(ctx, new Date(), id);
    if (r.issued === 0) return err("Couldn't generate an invoice — check the template's customer and lines");
    return ok({ issued: r.issued });
  });
}
