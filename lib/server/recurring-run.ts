import { db } from "@/lib/server/db";
import type { RequestContext } from "@/lib/server/request-context";
import { createInvoiceCore } from "@/lib/server/invoice-create";
import { decToNum, dateOnly } from "@/lib/server/serialize";

export type RecurringFrequency = "Weekly" | "Monthly" | "Quarterly" | "Yearly";

/** Advance a date by one cadence of the schedule (interval periods). */
export function nextRunFrom(from: Date, frequency: string, interval: number): Date {
  const d = new Date(from);
  const n = Math.max(1, interval);
  switch (frequency) {
    case "Weekly": d.setDate(d.getDate() + 7 * n); break;
    case "Quarterly": d.setMonth(d.getMonth() + 3 * n); break;
    case "Yearly": d.setFullYear(d.getFullYear() + n); break;
    case "Monthly":
    default: d.setMonth(d.getMonth() + n); break;
  }
  return d;
}

export interface GenerateResult { issued: number; invoiceIds: string[] }

/**
 * Issue invoices for the current tenant's due recurring templates and advance each schedule. The
 * context must already be bound (withAuth for the manual "Generate now", runWithContext for the
 * cron), so this works in both. Pass `onlyId` to run a single template immediately regardless of
 * its next-run date. A template whose invoice fails (e.g. its customer was deleted) is skipped and
 * left for the next run rather than silently advanced.
 */
export async function generateDueRecurring(ctx: RequestContext, now: Date, onlyId?: string): Promise<GenerateResult> {
  const templates = await db.recurringInvoice.findMany({
    where: { active: true, ...(onlyId ? { id: onlyId } : { nextRunAt: { lte: now } }) },
    include: { lines: true },
  });

  const invoiceIds: string[] = [];
  for (const tpl of templates) {
    if (tpl.endDate && tpl.endDate < now) continue;
    if (tpl.lines.length === 0) continue;

    const issueDate = dateOnly(now);
    const dueDate = dateOnly(new Date(now.getTime() + 30 * 86_400_000));
    const res = await createInvoiceCore(ctx, {
      customerId: tpl.customerId,
      issueDate,
      dueDate,
      status: "Sent",
      notes: tpl.notes ? `Recurring · ${tpl.notes}` : `Recurring invoice`,
      lines: tpl.lines.map((l) => ({
        description: l.description,
        quantity: decToNum(l.quantity),
        unitPrice: decToNum(l.unitPrice),
        discountPct: decToNum(l.discountPct),
        vatPct: decToNum(l.vatPct),
      })),
    });
    if (!res.ok) continue;

    invoiceIds.push(res.data.id);
    // Advance from the scheduled next-run (not `now`) so cadence stays stable even if a run was late.
    const base = tpl.nextRunAt > now ? now : tpl.nextRunAt;
    await db.recurringInvoice.update({
      where: { id: tpl.id },
      data: { nextRunAt: nextRunFrom(base, tpl.frequency, tpl.interval), lastInvoiceId: res.data.id },
    });
  }
  return { issued: invoiceIds.length, invoiceIds };
}
