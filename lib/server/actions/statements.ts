"use server";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import { decToNum } from "@/lib/server/serialize";
import { fiscalYearBounds, priorFiscalYearBounds, fiscalQuarterBounds, type FiscalYearBounds } from "@/lib/server/fiscal";
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

interface Account { code: string; name: string; type: string }
interface Movement { debit: number; credit: number }

/** The flow window (start/end) for a period inside a fiscal year. */
function periodWindow(period: StatementPeriod, fy: FiscalYearBounds): { start: Date; end: Date } {
  if (period === "FY") return { start: fy.fyStart, end: fy.fyEnd };
  const q = Number(period[1]) as 1 | 2 | 3 | 4;
  return fiscalQuarterBounds(fy.fyStart, q);
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

interface CashFlowFigures {
  netProfit: number;
  operating: { label: string; amount: number }[];
  investing: { label: string; amount: number }[];
  financing: { label: string; amount: number }[];
  operatingTotal: number;
  investingTotal: number;
  financingTotal: number;
  netMovement: number;
  cashStart: number;
  cashEnd: number;
}

/**
 * Indirect-method cash flow figures for one period, spanning fiscal-year-start (`opening`) to the
 * selected period end (`closing`). Every non-cash account is partitioned into exactly one section,
 * so operating + investing + financing reconciles exactly to the movement in cash: for a balanced
 * ledger the debit-normal balances of all accounts sum to zero, hence
 * Δcash = −Σ(Δ of every other account) = netProfit + Σ(cash impact of each balance-sheet account).
 */
function cashFlowFigures(accounts: Account[], closing: Map<string, Movement>, opening: Map<string, Movement>): CashFlowFigures {
  // Movement in an account's debit-normal balance between opening and closing.
  const flowDN = (code: string) => {
    const c = movementFor(code, closing);
    const o = movementFor(code, opening);
    return (c.debit - c.credit) - (o.debit - o.credit);
  };
  // Cash effect of a balance-sheet account's movement: a rise in an asset consumes cash, a rise in
  // a liability/equity account releases it.
  const cashImpact = (code: string) => -flowDN(code);

  // Net profit for the period = negative sum of the P&L accounts' debit-normal movement.
  const plTypes = new Set(["Income", "CostOfSales", "Expense"]);
  const netProfit = -accounts.filter((a) => plTypes.has(a.type)).reduce((s, a) => s + flowDN(a.code), 0);

  const operating = [
    { label: "Depreciation & amortisation", amount: cashImpact("1590") },
    { label: "Trade & other receivables", amount: cashImpact("1200") },
    { label: "Inventory", amount: cashImpact("1300") },
    { label: "Input VAT recoverable", amount: cashImpact("1250") },
    { label: "Trade & other payables", amount: cashImpact("2100") },
    { label: "Statutory payables", amount: cashImpact("2150") },
    { label: "Tax payable", amount: cashImpact("2200") },
  ];
  const investing = [
    { label: "Property, plant & equipment", amount: cashImpact("1500") },
    { label: "Intangible assets", amount: cashImpact("1600") },
  ];
  const financing = [
    { label: "Share capital", amount: cashImpact("3100") },
    { label: "Opening balance equity", amount: cashImpact("3900") },
    { label: "Retained earnings movement", amount: cashImpact("3200") },
    { label: "Bank loans", amount: cashImpact("2300") },
  ];

  const sum = (xs: { amount: number }[]) => xs.reduce((s, x) => s + x.amount, 0);
  const operatingTotal = netProfit + sum(operating);
  const investingTotal = sum(investing);
  const financingTotal = sum(financing);

  // Cash & cash equivalents: the leaf accounts under 1100 (1110–1150), excluding the 1100 rollup.
  const cashAccounts = accounts.filter((a) => a.code.startsWith("11") && a.code !== "1100");
  const cashAt = (moves: Map<string, Movement>) => cashAccounts.reduce((s, a) => {
    const m = movementFor(a.code, moves);
    return s + (m.debit - m.credit);
  }, 0);

  return {
    netProfit, operating, investing, financing,
    operatingTotal, investingTotal, financingTotal,
    netMovement: operatingTotal + investingTotal + financingTotal,
    cashStart: cashAt(opening),
    cashEnd: cashAt(closing),
  };
}

function buildCashFlow(
  accounts: Account[],
  curCum: Map<string, Movement>, openCum: Map<string, Movement>,
  priCum: Map<string, Movement>, priOpenCum: Map<string, Movement>,
): FinancialStatementLine[] {
  const cur = cashFlowFigures(accounts, curCum, openCum);
  const pri = cashFlowFigures(accounts, priCum, priOpenCum);
  const lines: FinancialStatementLine[] = [];

  const section = (header: string, curRows: { label: string; amount: number }[], priRows: { label: string; amount: number }[], total: string, curTotal: number, priTotal: number, lead?: { label: string; c: number; p: number }) => {
    lines.push({ label: header, current: 0, prior: 0, isHeader: true });
    if (lead) lines.push({ label: lead.label, current: lead.c, prior: lead.p, indent: 1 });
    for (let i = 0; i < curRows.length; i += 1) {
      const c = curRows[i]!.amount, p = priRows[i]!.amount;
      if (c === 0 && p === 0) continue;
      lines.push({ label: curRows[i]!.label, current: c, prior: p, indent: 1 });
    }
    lines.push({ label: total, current: curTotal, prior: priTotal, isTotal: true });
  };

  section("Operating activities", cur.operating, pri.operating, "Net cash from operating activities", cur.operatingTotal, pri.operatingTotal, { label: "Net profit for the period", c: cur.netProfit, p: pri.netProfit });
  section("Investing activities", cur.investing, pri.investing, "Net cash from investing activities", cur.investingTotal, pri.investingTotal);
  section("Financing activities", cur.financing, pri.financing, "Net cash from financing activities", cur.financingTotal, pri.financingTotal);

  lines.push({ label: "Net movement in cash", current: cur.netMovement, prior: pri.netMovement, isTotal: true });
  lines.push({ label: "Cash at start of period", current: cur.cashStart, prior: pri.cashStart, indent: 1 });
  lines.push({ label: "Cash at end of period", current: cur.cashEnd, prior: pri.cashEnd, isTotal: true });
  return lines;
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
  // DB-side aggregation over the [tenantId, accountCode, date] index — no full-table load.
  const rows = await db.gLEntry.groupBy({
    by: ["accountCode"],
    where: { date: { gte: start, lte: end } },
    _sum: { debit: true, credit: true },
  });
  const map = new Map<string, Movement>();
  for (const r of rows) {
    map.set(r.accountCode, { debit: decToNum(r._sum.debit ?? 0), credit: decToNum(r._sum.credit ?? 0) });
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
    const now = new Date();
    const [coaRows, company] = await Promise.all([
      db.cOAAccount.findMany({ select: { code: true, name: true, type: true } }),
      db.companyProfile.findFirst({ select: { name: true, fiscalYearStartMonth: true } }),
    ]);
    const accounts: Account[] = coaRows.map((a) => ({ code: a.code, name: a.name, type: a.type }));

    const startMonth = company?.fiscalYearStartMonth ?? 1;
    const curFy = fiscalYearBounds(now, startMonth);
    const priFy = priorFiscalYearBounds(now, startMonth);
    const curWin = periodWindow(period, curFy);
    const priWin = periodWindow(period, priFy);

    // Flow movements within the selected period; cumulative balances up to the period end;
    // opening cumulative = everything before the current fiscal year begins.
    const [curFlow, priFlow, curCum, priCum, openCum, priOpenCum] = await Promise.all([
      movementsBetween(curWin.start, curWin.end),
      movementsBetween(priWin.start, priWin.end),
      movementsBetween(new Date(2000, 0, 1), curWin.end),
      movementsBetween(new Date(2000, 0, 1), priWin.end),
      movementsBetween(new Date(2000, 0, 1), new Date(curFy.fyStart.getTime() - 1)),
      movementsBetween(new Date(2000, 0, 1), new Date(priFy.fyStart.getTime() - 1)),
    ]);

    const is = buildIncomeStatement(accounts, curFlow, priFlow);
    const bs = buildBalanceSheet(accounts, curCum, priCum, is.net);
    const cf = buildCashFlow(accounts, curCum, openCum, priCum, priOpenCum);
    const eq = buildEquityChanges(accounts, openCum, is.net);

    return {
      period,
      companyName: company?.name ?? "Your Company",
      currentLabel: period === "FY" ? curFy.label : `${period} ${curFy.label}`,
      priorLabel: period === "FY" ? priFy.label : `${period} ${priFy.label}`,
      incomeStatement: is.lines,
      balanceSheet: bs,
      cashFlow: cf,
      equityChanges: eq,
    };
  });
}
