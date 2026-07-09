"use server";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import { canClosePeriod } from "@/lib/auth/roles";
import { applyJournalEntry, type JournalLineInput } from "@/lib/server/journal-posting";
import { ensureCoaAccount } from "@/lib/server/gl-postings";
import { priorFiscalYearBounds } from "@/lib/server/fiscal";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum, dateOnly } from "@/lib/server/serialize";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
const PNL = new Set(["Income", "Expense", "CostOfSales"]);

/** Compute the P&L result for the most-recently-ended fiscal year and whether it's already closed. */
async function computeClose(startMonth: number) {
  const fy = priorFiscalYearBounds(new Date(), startMonth);
  const closeRef = `CLOSE-${fy.fyStart.getFullYear()}`;
  const [existing, gl, coa] = await Promise.all([
    db.journalEntryGroup.findFirst({ where: { reference: closeRef, status: "Posted" } }),
    db.gLEntry.findMany({ where: { date: { gte: fy.fyStart, lte: fy.fyEnd } }, select: { accountCode: true, debit: true, credit: true } }),
    db.cOAAccount.findMany({ select: { code: true, name: true, type: true } }),
  ]);
  const meta = new Map(coa.map((a) => [a.code, a]));
  const agg = new Map<string, { debit: number; credit: number }>();
  for (const r of gl) {
    const a = meta.get(r.accountCode);
    if (!a || !PNL.has(a.type)) continue;
    const cur = agg.get(r.accountCode) ?? { debit: 0, credit: 0 };
    cur.debit += decToNum(r.debit);
    cur.credit += decToNum(r.credit);
    agg.set(r.accountCode, cur);
  }
  const lines: JournalLineInput[] = [];
  let net = 0;
  for (const [code, m] of agg) {
    const a = meta.get(code)!;
    const isIncome = a.type === "Income";
    const bal = isIncome ? m.credit - m.debit : m.debit - m.credit; // natural positive
    if (Math.abs(bal) < 0.005) continue;
    if (isIncome) {
      lines.push({ accountCode: code, accountName: a.name, debit: round2(bal), credit: 0 });
      net += bal;
    } else {
      lines.push({ accountCode: code, accountName: a.name, debit: 0, credit: round2(bal) });
      net -= bal;
    }
  }
  return { fy, closeRef, lines, net: round2(net), closed: !!existing };
}

export async function getCloseStatus(): Promise<{ label: string; fyEnd: string; netProfit: number; closed: boolean; hasActivity: boolean }> {
  return withAuth(async () => {
    const company = await db.companyProfile.findFirst({ select: { fiscalYearStartMonth: true } });
    const { fy, lines, net, closed } = await computeClose(company?.fiscalYearStartMonth ?? 1);
    return { label: fy.label, fyEnd: dateOnly(fy.fyEnd), netProfit: net, closed, hasActivity: lines.length > 0 };
  });
}

/**
 * Year-end close: posts a closing journal that Dr's income and Cr's expense/cost accounts for the
 * most-recently-ended fiscal year, with the net result to Retained Earnings (3200), then locks the
 * books through that fiscal year end so nothing more can post into it.
 */
export async function closeFiscalYear(): Promise<Result<{ label: string; netProfit: number }>> {
  return withAuth(async (ctx) => {
    if (!canClosePeriod(ctx.role)) return err("Only senior finance roles can close the year");
    const company = await db.companyProfile.findFirst({ select: { fiscalYearStartMonth: true } });
    const { fy, closeRef, lines, net, closed } = await computeClose(company?.fiscalYearStartMonth ?? 1);
    if (closed) return err(`${fy.label} is already closed`);
    if (lines.length === 0) return err(`No income or expense activity to close for ${fy.label}`);

    // Net result → Retained Earnings (Cr for a profit, Dr for a loss).
    lines.push(
      net >= 0
        ? { accountCode: "3200", accountName: "Retained Earnings", debit: 0, credit: net }
        : { accountCode: "3200", accountName: "Retained Earnings", debit: -net, credit: 0 },
    );

    await db.$transaction(async (tx) => {
      await ensureCoaAccount(tx, ctx.tenantId, "3200", "Retained Earnings", "Equity", "3000", 1);
      // Post first (the old lock, if any, is before this fy end), then advance the lock.
      await applyJournalEntry(tx, ctx.tenantId, ctx, {
        lines,
        narration: `Year-end close · ${fy.label}`,
        reference: closeRef,
        date: dateOnly(fy.fyEnd),
      });
      await tx.companyProfile.updateMany({ data: { booksLockedThrough: fy.fyEnd } });
    });
    return ok({ label: fy.label, netProfit: net });
  });
}
