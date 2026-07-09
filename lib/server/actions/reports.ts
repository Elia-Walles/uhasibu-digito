"use server";
import { withAuth } from "@/lib/server/with-auth";
import { db } from "@/lib/server/db";
import { getStatements, getTrialBalance } from "@/lib/server/actions/statements";
import { getChartOfAccounts } from "@/lib/server/actions/ledger";
import { listInvoices } from "@/lib/server/actions/invoices";
import { listVATReturns } from "@/lib/server/actions/tax";
import { listPayrollRuns } from "@/lib/server/actions/payroll";
import { listInventory } from "@/lib/server/actions/inventory";
import { listBudgetLines } from "@/lib/server/actions/crm";
import { listPurchaseOrders } from "@/lib/server/actions/procurement";
import { buildReportWorkbook } from "@/lib/utils/report-export";
import { workbookToBase64 } from "@/lib/utils/excel-build";
import type { ReportData, ReportSection } from "@/lib/utils/report-data";
import type { FinancialStatementLine } from "@/types";
import type { ExportFile } from "@/lib/server/actions/exports";

// ── Ageing (also reused by the AI grounding snapshot) ──────────────────────────
export interface AgeingRow { name: string; current: number; d1_30: number; d31_60: number; d61_90: number; d90plus: number; total: number; }
export interface AgeingReport { rows: AgeingRow[]; totals: AgeingRow; }

function daysPast(dateStr: string, today: Date): number {
  return Math.floor((today.getTime() - new Date(dateStr).getTime()) / 86_400_000);
}

function bucketInto(map: Map<string, AgeingRow>, name: string, amount: number, overdue: number): void {
  const row = map.get(name) ?? { name, current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 };
  if (overdue <= 0) row.current += amount;
  else if (overdue <= 30) row.d1_30 += amount;
  else if (overdue <= 60) row.d31_60 += amount;
  else if (overdue <= 90) row.d61_90 += amount;
  else row.d90plus += amount;
  row.total += amount;
  map.set(name, row);
}

function summariseAgeing(map: Map<string, AgeingRow>): AgeingReport {
  const rows = [...map.values()].filter((r) => Math.abs(r.total) > 0.01).sort((a, b) => b.total - a.total);
  const totals = rows.reduce<AgeingRow>((t, r) => ({
    name: "Total", current: t.current + r.current, d1_30: t.d1_30 + r.d1_30, d31_60: t.d31_60 + r.d31_60,
    d61_90: t.d61_90 + r.d61_90, d90plus: t.d90plus + r.d90plus, total: t.total + r.total,
  }), { name: "Total", current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 });
  return { rows, totals };
}

/** Aged receivables from the invoice ledger (exact): outstanding per invoice, aged by due date. */
export async function getAgedReceivables(): Promise<AgeingReport> {
  return withAuth(async () => {
    const invoices = await listInvoices();
    const today = new Date();
    const map = new Map<string, AgeingRow>();
    for (const inv of invoices) {
      if (inv.status === "Draft" || inv.status === "Cancelled") continue;
      const outstanding = inv.total - inv.amountPaid;
      if (outstanding <= 0.01) continue;
      bucketInto(map, inv.customerName, outstanding, daysPast(inv.dueDate, today));
    }
    return summariseAgeing(map);
  });
}

/** Aged payables — approximate (no supplier-bill model): open POs with an invoice received,
 *  due 30 days after the PO date, amount = PO total. */
export async function getAgedPayables(): Promise<AgeingReport> {
  return withAuth(async () => {
    const pos = await listPurchaseOrders();
    const today = new Date();
    const map = new Map<string, AgeingRow>();
    for (const po of pos) {
      if (!po.matchStatus.invoiceReceived) continue;
      const due = new Date(new Date(po.date).getTime() + 30 * 86_400_000).toISOString().split("T")[0]!;
      bucketInto(map, po.supplierName, po.total, daysPast(due, today));
    }
    return summariseAgeing(map);
  });
}

// ── Report builders ────────────────────────────────────────────────────────────
function stmtSection(title: string, lines: FinancialStatementLine[], curLabel: string, priLabel: string): ReportSection {
  return {
    title,
    columns: [{ key: "line", label: "" }, { key: "current", label: curLabel, kind: "money" }, { key: "prior", label: priLabel, kind: "money" }],
    rows: lines.map((l) => ({ line: `${"  ".repeat(l.indent ?? 0)}${l.label}`, current: l.current, prior: l.prior })),
  };
}

const AGEING_COLUMNS = [
  { key: "name", label: "Account" },
  { key: "current", label: "Current", kind: "money" as const },
  { key: "d1_30", label: "1–30 days", kind: "money" as const },
  { key: "d31_60", label: "31–60 days", kind: "money" as const },
  { key: "d61_90", label: "61–90 days", kind: "money" as const },
  { key: "d90plus", label: "90+ days", kind: "money" as const },
  { key: "total", label: "Total", kind: "money" as const },
];

function ageingSection(title: string, report: AgeingReport): ReportSection {
  return { title, columns: AGEING_COLUMNS, rows: [...report.rows, report.totals] as unknown as Record<string, string | number>[] };
}

async function buildReport(reportId: string): Promise<ReportData> {
  const company = (await db.companyProfile.findFirst({ select: { name: true } }))?.name ?? "Your Company";
  const base = (title: string, subtitle: string, sections: ReportSection[]): ReportData => ({ id: reportId, title, subtitle, company, sections });

  switch (reportId) {
    case "r_is": case "r_bs": case "r_cf": case "r_eq": {
      const v = await getStatements("FY");
      const pick = { r_is: ["Income Statement", v.incomeStatement], r_bs: ["Balance Sheet", v.balanceSheet], r_cf: ["Cash Flow Statement", v.cashFlow], r_eq: ["Statement of Changes in Equity", v.equityChanges] } as const;
      const [title, lines] = pick[reportId as keyof typeof pick];
      return base(title, `${v.currentLabel} vs ${v.priorLabel}`, [stmtSection(title, lines as FinancialStatementLine[], v.currentLabel, v.priorLabel)]);
    }
    case "r_tb": {
      const tb = await getTrialBalance();
      return base("Trial Balance", `As at ${tb.asAt}`, [{
        title: "Trial Balance",
        columns: [{ key: "code", label: "Code" }, { key: "name", label: "Account" }, { key: "debit", label: "Debit", kind: "money" }, { key: "credit", label: "Credit", kind: "money" }],
        rows: [...tb.rows.map((r) => ({ code: r.code, name: r.name, debit: r.debit, credit: r.credit })), { code: "", name: "TOTAL", debit: tb.totalDebit, credit: tb.totalCredit }],
      }]);
    }
    case "r_gl": {
      const coa = await getChartOfAccounts();
      return base("General Ledger", "Account balances derived from the ledger", [{
        title: "General Ledger",
        columns: [{ key: "code", label: "Code" }, { key: "name", label: "Account" }, { key: "opening", label: "Opening", kind: "money" }, { key: "movement", label: "Movement", kind: "money" }, { key: "closing", label: "Closing", kind: "money" }],
        rows: coa.filter((a) => a.openingBalance !== 0 || a.movement !== 0 || a.closingBalance !== 0)
          .map((a) => ({ code: a.code, name: a.name, opening: a.openingBalance, movement: a.movement, closing: a.closingBalance })),
      }]);
    }
    case "r_bva": {
      const lines = await listBudgetLines();
      return base("Budget vs Actual", "Year-to-date variance by line item", [{
        title: "Budget vs Actual",
        columns: [{ key: "lineItem", label: "Line item" }, { key: "category", label: "Category" }, { key: "annual", label: "Annual budget", kind: "money" }, { key: "ytdBudget", label: "YTD budget", kind: "money" }, { key: "ytdActual", label: "YTD actual", kind: "money" }, { key: "variance", label: "Variance", kind: "money" }],
        rows: lines.map((b) => ({ lineItem: b.lineItem, category: b.category, annual: b.annualBudget, ytdBudget: b.ytdBudget, ytdActual: b.ytdActual, variance: b.ytdVariance })),
      }]);
    }
    case "r_cust": {
      const invoices = await listInvoices();
      const byCust = new Map<string, { revenue: number; vat: number; total: number; count: number }>();
      for (const inv of invoices) {
        if (inv.status === "Draft" || inv.status === "Cancelled") continue;
        const c = byCust.get(inv.customerName) ?? { revenue: 0, vat: 0, total: 0, count: 0 };
        c.revenue += inv.subtotal; c.vat += inv.vatAmount; c.total += inv.total; c.count += 1;
        byCust.set(inv.customerName, c);
      }
      return base("Profitability by Customer", "Revenue billed per customer", [{
        title: "By Customer",
        columns: [{ key: "name", label: "Customer" }, { key: "count", label: "Invoices", kind: "number" }, { key: "revenue", label: "Revenue (net)", kind: "money" }, { key: "vat", label: "VAT", kind: "money" }, { key: "total", label: "Total billed", kind: "money" }],
        rows: [...byCust.entries()].sort((a, b) => b[1].revenue - a[1].revenue).map(([name, c]) => ({ name, count: c.count, revenue: c.revenue, vat: c.vat, total: c.total })),
      }]);
    }
    case "r_vat": {
      const rets = await listVATReturns();
      return base("VAT Return Summary", "Output and input VAT by period", [{
        title: "VAT Returns",
        columns: [{ key: "period", label: "Period" }, { key: "output", label: "Output VAT", kind: "money" }, { key: "input", label: "Input VAT", kind: "money" }, { key: "payable", label: "VAT payable", kind: "money" }],
        rows: rets.map((r) => ({ period: r.period, output: r.outputVAT, input: r.inputVAT, payable: r.vatPayable })),
      }]);
    }
    case "r_paye": case "r_pay": case "r_stat": {
      const runs = await listPayrollRuns();
      if (reportId === "r_paye") {
        return base("PAYE Return", "Pay-as-you-earn by payroll run", [{
          title: "PAYE",
          columns: [{ key: "period", label: "Period" }, { key: "gross", label: "Gross", kind: "money" }, { key: "paye", label: "PAYE", kind: "money" }],
          rows: runs.map((r) => ({ period: r.period, gross: r.totalGross, paye: r.totalPAYE })),
        }]);
      }
      if (reportId === "r_stat") {
        return base("Statutory Deductions", "NSSF, SDL, WCF & PAYE by run", [{
          title: "Statutory",
          columns: [{ key: "period", label: "Period" }, { key: "paye", label: "PAYE", kind: "money" }, { key: "nssf", label: "NSSF", kind: "money" }, { key: "sdl", label: "SDL", kind: "money" }, { key: "wcf", label: "WCF", kind: "money" }],
          rows: runs.map((r) => ({ period: r.period, paye: r.totalPAYE, nssf: r.totalNSSF, sdl: r.totalSDL, wcf: r.totalWCF })),
        }]);
      }
      return base("Payroll Summary", "Gross, deductions and net by run", [{
        title: "Payroll",
        columns: [{ key: "period", label: "Period" }, { key: "gross", label: "Gross", kind: "money" }, { key: "paye", label: "PAYE", kind: "money" }, { key: "nssf", label: "NSSF", kind: "money" }, { key: "sdl", label: "SDL", kind: "money" }, { key: "wcf", label: "WCF", kind: "money" }, { key: "net", label: "Net pay", kind: "money" }],
        rows: runs.map((r) => ({ period: r.period, gross: r.totalGross, paye: r.totalPAYE, nssf: r.totalNSSF, sdl: r.totalSDL, wcf: r.totalWCF, net: r.totalNet })),
      }]);
    }
    case "r_inv": {
      const items = await listInventory();
      return base("Inventory Valuation", "Stock on hand and value", [{
        title: "Inventory",
        columns: [{ key: "code", label: "Code" }, { key: "name", label: "Item" }, { key: "onHand", label: "On hand", kind: "number" }, { key: "unitCost", label: "Unit cost", kind: "money" }, { key: "value", label: "Value", kind: "money" }],
        rows: items.map((i) => ({ code: i.code, name: i.name, onHand: i.onHand, unitCost: i.unitCost, value: i.totalValue })),
      }]);
    }
    case "r_age": {
      const ar = await getAgedReceivables();
      return base("Customer Ageing", "Receivables by ageing bucket", [ageingSection("Receivables", ar)]);
    }
    case "r_sage": {
      const ap = await getAgedPayables();
      return base("Supplier Ageing", "Payables by ageing bucket (approximate)", [ageingSection("Payables", ap)]);
    }
    default:
      throw new Error("This report isn't available yet");
  }
}

export interface FinancialHealth {
  fyLabel: string;
  revenue: number;
  grossProfit: number;
  netProfit: number;
  grossMargin: number; // %
  netMargin: number; // %
  currentAssets: number;
  currentLiabilities: number;
  currentRatio: number;
  cash: number;
  receivables: number;
  payables: number;
  dso: number; // days sales outstanding
}

/** Live financial-health metrics derived from the GL — powers the AI grounding + the assistant rail. */
export async function getFinancialHealth(): Promise<FinancialHealth> {
  return withAuth(async () => {
    const [view, coa] = await Promise.all([getStatements("FY"), getChartOfAccounts()]);
    const bal = (code: string) => coa.find((a) => a.code === code)?.closingBalance ?? 0;
    const cash = coa.filter((a) => a.code.startsWith("11") && a.code !== "1100").reduce((s, a) => s + a.closingBalance, 0);
    const receivables = bal("1200");
    const payables = bal("2100");
    const currentAssets = cash + receivables + bal("1250") + bal("1300");
    const currentLiabilities = bal("2100") + bal("2150") + bal("2200") + bal("2300");
    const il = (label: string) => view.incomeStatement.find((l) => l.label === label)?.current ?? 0;
    const revenue = il("Revenue");
    const grossProfit = il("Gross profit");
    const netProfit = il("Net profit");
    return {
      fyLabel: view.currentLabel,
      revenue, grossProfit, netProfit,
      grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
      netMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
      currentAssets, currentLiabilities,
      currentRatio: currentLiabilities > 0 ? currentAssets / currentLiabilities : 0,
      cash, receivables, payables,
      dso: revenue > 0 ? (receivables / revenue) * 365 : 0,
    };
  });
}

export async function getReportData(reportId: string): Promise<ReportData> {
  return withAuth(async () => buildReport(reportId));
}

export async function exportReportXlsx(reportId: string): Promise<ExportFile> {
  return withAuth(async () => {
    const report = await buildReport(reportId);
    const wb = await buildReportWorkbook(report);
    const filename = `${report.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.xlsx`;
    return { filename, base64: await workbookToBase64(wb) };
  });
}
