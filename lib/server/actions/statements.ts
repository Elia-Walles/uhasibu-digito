"use server";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import { decToNum } from "@/lib/server/serialize";
import type { FinancialStatementLine } from "@/types";

export type StatementPeriod = "Q1" | "Q2" | "Q3" | "Q4" | "FY";

export interface PeriodView {
  period: StatementPeriod;
  companyName: string;
  currentLabel: string;
  priorLabel: string;
  incomeStatement: FinancialStatementLine[];
  balanceSheet: FinancialStatementLine[];
  cashFlow: FinancialStatementLine[];
  equityChanges: FinancialStatementLine[];
}

const QUARTER_MONTHS: Record<StatementPeriod, [number, number]> = {
  Q1: [0, 2], Q2: [3, 5], Q3: [6, 8], Q4: [9, 11], FY: [0, 11],
};

interface Account { code: string; name: string; type: string }
interface Movement { debit: number; credit: number }

function rangeEnd(year: number, period: StatementPeriod): Date {
  const [, endM] = QUARTER_MONTHS[period];
  return new Date(year, endM + 1, 0, 23, 59, 59, 999);
}
function rangeStart(year: number): Date {
  return new Date(year, 0, 1, 0, 0, 0, 0);
}

/** Net debit-positive movement for an account over [start, end]. */
function movementFor(code: string, moves: Map<string, Movement>): Movement {
  return moves.get(code) ?? { debit: 0, credit: 0 };
}

function buildIncomeStatement(accounts: Account[], cur: Map<string, Movement>, prior: Map<string, Movement>): { lines: FinancialStatementLine[]; net: { cur: number; prior: number } } {
  // Credit-normal income; debit-normal cost/expense.
  const sumBy = (pred: (a: Account) => boolean, moves: Map<string, Movement>, creditNormal: boolean) =>
    accounts.filter(pred).reduce((s, a) => {
      const m = movementFor(a.code, moves);
      return s + (creditNormal ? m.credit - m.debit : m.debit - m.credit);
    }, 0);

  const revenueCur = sumBy((a) => a.type === "Income", cur, true);
  const revenuePri = sumBy((a) => a.type === "Income", prior, true);
  const cogsCur = sumBy((a) => a.type === "CostOfSales", cur, false);
  const cogsPri = sumBy((a) => a.type === "CostOfSales", prior, false);
  const opexCur = sumBy((a) => a.type === "Expense" && !a.code.startsWith("7"), cur, false);
  const opexPri = sumBy((a) => a.type === "Expense" && !a.code.startsWith("7"), prior, false);
  const finCur = sumBy((a) => a.type === "Expense" && a.code.startsWith("7"), cur, false);
  const finPri = sumBy((a) => a.type === "Expense" && a.code.startsWith("7"), prior, false);

  const grossCur = revenueCur - cogsCur, grossPri = revenuePri - cogsPri;
  const opCur = grossCur - opexCur, opPri = grossPri - opexPri;
  const netCur = opCur - finCur, netPri = opPri - finPri;

  const lines: FinancialStatementLine[] = [
    { label: "Revenue", current: revenueCur, prior: revenuePri },
    { label: "Cost of sales", current: cogsCur, prior: cogsPri, isNegative: true },
    { label: "Gross profit", current: grossCur, prior: grossPri, isTotal: true },
    { label: "Operating expenses", current: opexCur, prior: opexPri, isNegative: true },
    { label: "Operating profit", current: opCur, prior: opPri, isTotal: true },
    { label: "Finance costs", current: finCur, prior: finPri, isNegative: true },
    { label: "Net profit", current: netCur, prior: netPri, isTotal: true },
  ];
  return { lines, net: { cur: netCur, prior: netPri } };
}

function buildBalanceSheet(accounts: Account[], curCum: Map<string, Movement>, priCum: Map<string, Movement>, net: { cur: number; prior: number }): FinancialStatementLine[] {
  const bal = (a: Account, moves: Map<string, Movement>) => {
    const m = movementFor(a.code, moves);
    const creditNormal = a.type === "Liability" || a.type === "Equity";
    return creditNormal ? m.credit - m.debit : m.debit - m.credit;
  };
  const section = (type: string) => accounts.filter((a) => a.type === type && a.code.length >= 4 && !["1000", "2000", "3000"].includes(a.code));

  const lines: FinancialStatementLine[] = [];
  let assetCur = 0, assetPri = 0;
  lines.push({ label: "Assets", current: 0, prior: 0, isHeader: true });
  for (const a of section("Asset")) {
    const c = bal(a, curCum), p = bal(a, priCum);
    if (c === 0 && p === 0) continue;
    assetCur += c; assetPri += p;
    lines.push({ label: a.name, current: c, prior: p, indent: 1 });
  }
  lines.push({ label: "Total assets", current: assetCur, prior: assetPri, isTotal: true });

  lines.push({ label: "Liabilities", current: 0, prior: 0, isHeader: true });
  let liabCur = 0, liabPri = 0;
  for (const a of section("Liability")) {
    const c = bal(a, curCum), p = bal(a, priCum);
    if (c === 0 && p === 0) continue;
    liabCur += c; liabPri += p;
    lines.push({ label: a.name, current: c, prior: p, indent: 1 });
  }
  lines.push({ label: "Total liabilities", current: liabCur, prior: liabPri, isTotal: true });

  lines.push({ label: "Equity", current: 0, prior: 0, isHeader: true });
  let eqCur = 0, eqPri = 0;
  for (const a of section("Equity")) {
    const c = bal(a, curCum), p = bal(a, priCum);
    eqCur += c; eqPri += p;
    if (c === 0 && p === 0) continue;
    lines.push({ label: a.name, current: c, prior: p, indent: 1 });
  }
  // Current-year result accrues to equity.
  eqCur += net.cur; eqPri += net.prior;
  lines.push({ label: "Retained result for the year", current: net.cur, prior: net.prior, indent: 1 });
  lines.push({ label: "Total equity", current: eqCur, prior: eqPri, isTotal: true });
  lines.push({ label: "Total equity & liabilities", current: eqCur + liabCur, prior: eqPri + liabPri, isTotal: true });
  return lines;
}

function buildCashFlow(accounts: Account[], curCum: Map<string, Movement>, openCum: Map<string, Movement>, net: { cur: number; prior: number }): FinancialStatementLine[] {
  const cashAccounts = accounts.filter((a) => a.code.startsWith("11") && a.code.length > 4);
  const cashAt = (moves: Map<string, Movement>) => cashAccounts.reduce((s, a) => {
    const m = movementFor(a.code, moves);
    return s + (m.debit - m.credit);
  }, 0);
  const closing = cashAt(curCum);
  const opening = cashAt(openCum);
  return [
    { label: "Net profit for the period", current: net.cur, prior: net.prior },
    { label: "Net movement in cash", current: closing - opening, prior: 0, isTotal: true },
    { label: "Cash at start of period", current: opening, prior: 0 },
    { label: "Cash at end of period", current: closing, prior: 0, isTotal: true },
  ];
}

function buildEquityChanges(accounts: Account[], openCum: Map<string, Movement>, net: { cur: number; prior: number }): FinancialStatementLine[] {
  const equityOpen = accounts.filter((a) => a.type === "Equity" && a.code.length >= 4 && a.code !== "3000")
    .reduce((s, a) => {
      const m = movementFor(a.code, openCum);
      return s + (m.credit - m.debit);
    }, 0);
  return [
    { label: "Opening equity", current: equityOpen, prior: 0 },
    { label: "Profit for the period", current: net.cur, prior: net.prior },
    { label: "Closing equity", current: equityOpen + net.cur, prior: 0, isTotal: true },
  ];
}

async function movementsBetween(start: Date, end: Date): Promise<Map<string, Movement>> {
  const rows = await db.gLEntry.findMany({ where: { date: { gte: start, lte: end } }, select: { accountCode: true, debit: true, credit: true } });
  const map = new Map<string, Movement>();
  for (const r of rows) {
    const m = map.get(r.accountCode) ?? { debit: 0, credit: 0 };
    m.debit += decToNum(r.debit);
    m.credit += decToNum(r.credit);
    map.set(r.accountCode, m);
  }
  return map;
}

export interface TrialBalanceRow {
  code: string;
  name: string;
  debit: number;
  credit: number;
}
export interface TrialBalanceView {
  companyName: string;
  asAt: string;
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
}

export async function getTrialBalance(): Promise<TrialBalanceView> {
  return withAuth(async () => {
    const [coaRows, company] = await Promise.all([
      db.cOAAccount.findMany({ orderBy: { code: "asc" }, select: { code: true, name: true, type: true, level: true } }),
      db.companyProfile.findFirst({ select: { name: true } }),
    ]);
    const now = new Date();
    const cum = await movementsBetween(new Date(2000, 0, 1), now);

    const rows: TrialBalanceRow[] = [];
    let totalDebit = 0;
    let totalCredit = 0;
    for (const a of coaRows) {
      // Leaf-ish accounts: level 1 detail, plus the top-level CostOfSales line.
      if (!(a.level === 1 || (a.level === 0 && a.type === "CostOfSales"))) continue;
      const m = movementFor(a.code, cum);
      const debitNormal = a.type === "Asset" || a.type === "Expense" || a.type === "CostOfSales";
      const bal = debitNormal ? m.debit - m.credit : m.credit - m.debit;
      if (bal === 0) continue;
      const debit = debitNormal ? bal : 0;
      const credit = debitNormal ? 0 : bal;
      totalDebit += debit;
      totalCredit += credit;
      rows.push({ code: a.code, name: a.name, debit, credit });
    }
    return {
      companyName: company?.name ?? "Your Company",
      asAt: now.toISOString().split("T")[0]!,
      rows,
      totalDebit,
      totalCredit,
    };
  });
}

export async function getStatements(period: StatementPeriod): Promise<PeriodView> {
  return withAuth(async () => {
    const year = new Date().getFullYear();
    const priorYear = year - 1;
    const [coaRows, company] = await Promise.all([
      db.cOAAccount.findMany({ select: { code: true, name: true, type: true } }),
      db.companyProfile.findFirst({ select: { name: true } }),
    ]);
    const accounts: Account[] = coaRows.map((a) => ({ code: a.code, name: a.name, type: a.type }));

    // Flow movements within the selected period; cumulative balances up to the period end.
    const [curFlow, priFlow, curCum, priCum, openCum] = await Promise.all([
      movementsBetween(new Date(year, QUARTER_MONTHS[period][0], 1), rangeEnd(year, period)),
      movementsBetween(new Date(priorYear, QUARTER_MONTHS[period][0], 1), rangeEnd(priorYear, period)),
      movementsBetween(new Date(2000, 0, 1), rangeEnd(year, period)),
      movementsBetween(new Date(2000, 0, 1), rangeEnd(priorYear, period)),
      movementsBetween(new Date(2000, 0, 1), new Date(rangeStart(year).getTime() - 1)),
    ]);

    const is = buildIncomeStatement(accounts, curFlow, priFlow);
    const bs = buildBalanceSheet(accounts, curCum, priCum, is.net);
    const cf = buildCashFlow(accounts, curCum, openCum, is.net);
    const eq = buildEquityChanges(accounts, openCum, is.net);

    const label = period === "FY" ? `FY ${year}` : `${period} ${year}`;
    return {
      period,
      companyName: company?.name ?? "Your Company",
      currentLabel: label,
      priorLabel: period === "FY" ? `FY ${priorYear}` : `${period} ${priorYear}`,
      incomeStatement: is.lines,
      balanceSheet: bs,
      cashFlow: cf,
      equityChanges: eq,
    };
  });
}
