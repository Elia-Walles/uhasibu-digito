import type { FinancialStatementLine } from "@/types";
import {
  INCOME_STATEMENT,
  BALANCE_SHEET,
  CASH_FLOW,
  EQUITY_CHANGES,
  MONTHLY_REVENUE,
} from "@/lib/mock-data/financial-statements";

export type StatementPeriod = "Q1" | "Q2" | "Q3" | "Q4" | "FY";

const CURRENT_YEAR = 2024;
const PRIOR_YEAR = 2023;

const QUARTER_LABELS: Record<StatementPeriod, string> = {
  Q1: "Q1 (Jan–Mar)",
  Q2: "Q2 (Apr–Jun)",
  Q3: "Q3 (Jul–Sep)",
  Q4: "Q4 (Oct–Dec)",
  FY: "Full Year",
};

const QUARTER_END_DATE: Record<StatementPeriod, string> = {
  Q1: "31 Mar",
  Q2: "30 Jun",
  Q3: "30 Sep",
  Q4: "31 Dec",
  FY: "31 Dec",
};

function monthsFor(period: StatementPeriod): readonly number[] {
  switch (period) {
    case "Q1": return [0, 1, 2];
    case "Q2": return [3, 4, 5];
    case "Q3": return [6, 7, 8];
    case "Q4": return [9, 10, 11];
    case "FY": return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  }
}

/**
 * Derive a deterministic share-of-FY weight for a given period from the
 * monthly revenue seed so flow statements (income, cash flow, equity)
 * scale realistically across the selector.
 */
function flowWeight(period: StatementPeriod): number {
  const totalFY = MONTHLY_REVENUE.reduce((s, m) => s + m.revenue, 0);
  const months = monthsFor(period);
  const periodRev = months.reduce((s, i) => s + (MONTHLY_REVENUE[i]?.revenue ?? 0), 0);
  return periodRev / totalFY;
}

/**
 * Balance sheet (stock) figures vary much less period-to-period than
 * flow figures. Apply a gentle scaling so Q1 < Q2 < Q3 < Q4=FY snapshots.
 */
function stockWeight(period: StatementPeriod): number {
  switch (period) {
    case "Q1": return 0.86;
    case "Q2": return 0.91;
    case "Q3": return 0.95;
    case "Q4": return 1.0;
    case "FY": return 1.0;
  }
}

function priorYearFactor(): number {
  // Prior-year figures already live in the mock dataset as `prior`.
  return 1.0;
}

function scaleLines(
  lines: FinancialStatementLine[],
  weight: number,
  isStock: boolean,
): FinancialStatementLine[] {
  return lines.map((l) => {
    if (l.isHeader && l.current === 0 && l.prior === 0) {
      return l;
    }
    const scale = isStock ? Math.max(0.5, weight) : weight;
    return {
      ...l,
      current: Math.round(l.current * scale),
      prior: Math.round(l.prior * scale * priorYearFactor()),
    };
  });
}

export interface PeriodView {
  period: StatementPeriod;
  currentLabel: string;
  priorLabel: string;
  incomeStatement: FinancialStatementLine[];
  balanceSheet: FinancialStatementLine[];
  cashFlow: FinancialStatementLine[];
  equityChanges: FinancialStatementLine[];
}

export function buildPeriodView(period: StatementPeriod): PeriodView {
  const flow = flowWeight(period);
  const stock = stockWeight(period);
  const label = QUARTER_LABELS[period];
  const endDate = QUARTER_END_DATE[period];

  return {
    period,
    currentLabel: period === "FY"
      ? `FY ${CURRENT_YEAR}`
      : `${period} ${CURRENT_YEAR} (${label})`,
    priorLabel: period === "FY"
      ? `FY ${PRIOR_YEAR}`
      : `${period} ${PRIOR_YEAR}`,
    incomeStatement: scaleLines(INCOME_STATEMENT, flow, false),
    balanceSheet:    scaleLines(BALANCE_SHEET,    stock, true),
    cashFlow:        scaleLines(CASH_FLOW,        flow, false),
    equityChanges:   scaleLines(EQUITY_CHANGES,   flow, false),
  };
}

export function describePeriodAsAt(period: StatementPeriod): string {
  return `As at ${QUARTER_END_DATE[period]} ${CURRENT_YEAR}`;
}

export function describePeriodFor(period: StatementPeriod): string {
  if (period === "FY") return `For the year ended 31 Dec ${CURRENT_YEAR}`;
  return `For the period ended ${QUARTER_END_DATE[period]} ${CURRENT_YEAR}`;
}

export const PERIOD_OPTIONS: { value: StatementPeriod; label: string }[] = [
  { value: "Q1", label: `Q1 ${CURRENT_YEAR}` },
  { value: "Q2", label: `Q2 ${CURRENT_YEAR}` },
  { value: "Q3", label: `Q3 ${CURRENT_YEAR}` },
  { value: "Q4", label: `Q4 ${CURRENT_YEAR}` },
  { value: "FY", label: `Full Year ${CURRENT_YEAR}` },
];
