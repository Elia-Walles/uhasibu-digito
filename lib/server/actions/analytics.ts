"use server";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import { decToNum } from "@/lib/server/serialize";
import { getStatements } from "@/lib/server/actions/statements";
import type { TaxFiling } from "@/types";

export interface DashboardData {
  revenueMtd: number;
  salesToDate: number;
  cashPosition: number;
  receivables: number;
  netProfitFy: number;
  upcomingTax: TaxFiling[];
}

interface Movement {
  debit: number;
  credit: number;
}

/** Aggregate GL movements per account code over an optional date range (all-time if `from` is null). */
async function glMovements(from: Date | null, to: Date): Promise<Map<string, Movement>> {
  const rows = await db.gLEntry.findMany({
    where: from ? { date: { gte: from, lte: to } } : { date: { lte: to } },
    select: { accountCode: true, debit: true, credit: true },
  });
  const map = new Map<string, Movement>();
  for (const r of rows) {
    const m = map.get(r.accountCode) ?? { debit: 0, credit: 0 };
    m.debit += decToNum(r.debit);
    m.credit += decToNum(r.credit);
    map.set(r.accountCode, m);
  }
  return map;
}

/**
 * Dashboard KPIs, all derived from the General Ledger so they reconcile with the trial balance
 * and financial statements (the single source of truth): cash = balance of cash/bank accounts
 * (codes 11xx), receivables = Trade Receivables (1200), revenue = income-account movement.
 */
export async function getDashboard(): Promise<DashboardData> {
  return withAuth(async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const fyStart = new Date(now.getFullYear(), 0, 1);

    const [coaRows, glCum, glFy, glMtd, filings, statements] = await Promise.all([
      db.cOAAccount.findMany({ select: { code: true, type: true } }),
      glMovements(null, now), // cumulative balances as at now
      glMovements(fyStart, now), // FY-to-date flow
      glMovements(monthStart, now), // month-to-date flow
      db.taxFiling.findMany({
        where: { status: { in: ["Pending", "Upcoming", "Overdue"] } },
        orderBy: { dueDate: "asc" },
        take: 3,
      }),
      getStatements("FY"),
    ]);

    const incomeCodes = new Set(coaRows.filter((a) => a.type === "Income").map((a) => a.code));

    // Cash & bank: debit-normal balance of every 11xx detail account (matches the cash-flow definition).
    let cashPosition = 0;
    for (const [code, m] of glCum) {
      if (code.startsWith("11") && code.length > 4) cashPosition += m.debit - m.credit;
    }
    // Receivables: debit-normal balance of Trade Receivables.
    const ar = glCum.get("1200");
    const receivables = ar ? ar.debit - ar.credit : 0;
    // Revenue: credit-normal income movement.
    const sumIncome = (map: Map<string, Movement>) => {
      let total = 0;
      for (const [code, m] of map) if (incomeCodes.has(code)) total += m.credit - m.debit;
      return total;
    };
    const salesToDate = sumIncome(glFy);
    const revenueMtd = sumIncome(glMtd);
    const netLine = statements.incomeStatement.find((l) => l.label === "Net profit");

    return {
      revenueMtd,
      salesToDate,
      cashPosition,
      receivables,
      netProfitFy: netLine?.current ?? 0,
      upcomingTax: filings.map((f) => ({
        id: f.id,
        type: f.type as TaxFiling["type"],
        period: f.period,
        dueDate: f.dueDate.toISOString().split("T")[0]!,
        amount: decToNum(f.amount),
        status: f.status as TaxFiling["status"],
        ...(f.filedAt ? { filedAt: f.filedAt.toISOString() } : {}),
      })),
    };
  });
}

export interface ManagementMetrics {
  revenue: number;
  netProfit: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
}

export async function getManagementMetrics(): Promise<ManagementMetrics> {
  return withAuth(async () => {
    const s = await getStatements("FY");
    const pick = (label: string) => s.incomeStatement.find((l) => l.label === label)?.current ?? 0;
    const revenue = pick("Revenue");
    const gross = pick("Gross profit");
    const operating = pick("Operating profit");
    const net = pick("Net profit");
    const pct = (n: number) => (revenue > 0 ? (n / revenue) * 100 : 0);
    return {
      revenue,
      netProfit: net,
      grossMargin: pct(gross),
      operatingMargin: pct(operating),
      netMargin: pct(net),
    };
  });
}
