import type { db } from "./db";
import type { RequestContext } from "./request-context";
import { applyJournalEntry } from "./journal-posting";
import type { JournalLineInput } from "./journal-posting";
import type { AccountType } from "@/types";

// Interactive-transaction client for the extended `db`.
type Tx = Omit<typeof db, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Guard: a journal must have balanced debits and credits before it is posted. */
function assertBalanced(lines: JournalLineInput[]): void {
  const dr = round2(lines.reduce((s, l) => s + l.debit, 0));
  const cr = round2(lines.reduce((s, l) => s + l.credit, 0));
  if (Math.abs(dr - cr) > 0.01) {
    throw new Error(`Unbalanced journal: debit ${dr} != credit ${cr}`);
  }
}

/** Find-or-create a postable COA account for the tenant (accounts not in an older tenant's seed). */
export async function ensureCoaAccount(
  tx: Tx,
  tenantId: string,
  code: string,
  name: string,
  type: AccountType,
  parentCode: string,
  level = 2,
): Promise<void> {
  const existing = await tx.cOAAccount.findFirst({ where: { code, tenantId } });
  if (existing) return;
  await tx.cOAAccount.create({ data: { tenantId, code, name, type, parentCode, level } });
}

/** The cash/bank COA account a customer payment method debits. */
function paymentAccount(method: string): { code: string; name: string } {
  const m = method.toLowerCase();
  if (m.includes("cash")) return { code: "1140", name: "Cash on Hand" };
  if (/mpesa|m-pesa|tigo|airtel|halopesa|mobile/.test(m)) return { code: "1150", name: "Mobile Money (M-Pesa)" };
  return { code: "1110", name: "CRDB TZS Account" }; // bank transfer, cheque, card, default
}

// ===================================================================
// Accounts Receivable (invoices)
// ===================================================================

export interface InvoiceIssueInput {
  invoiceNumber: string;
  date: string; // YYYY-MM-DD
  net: number; // revenue excl. VAT
  vat: number;
  narration?: string;
}

/** Post an issued invoice: Dr Trade Receivables (gross), Cr Sales Revenue (net), Cr VAT (vat). */
export async function postInvoiceIssued(tx: Tx, tenantId: string, ctx: RequestContext, input: InvoiceIssueInput): Promise<void> {
  const total = round2(input.net + input.vat);
  const lines: JournalLineInput[] = [
    { accountCode: "1200", accountName: "Trade Receivables", debit: total, credit: 0 },
    { accountCode: "4100", accountName: "Sales Revenue", debit: 0, credit: input.net },
    ...(input.vat > 0 ? [{ accountCode: "2200", accountName: "Tax Payable", debit: 0, credit: input.vat }] : []),
  ];
  assertBalanced(lines);
  await applyJournalEntry(tx, tenantId, ctx, {
    lines,
    narration: input.narration ?? `Invoice ${input.invoiceNumber}`,
    reference: input.invoiceNumber,
    date: input.date,
  });
}

export interface InvoicePaymentJournalInput {
  invoiceNumber: string;
  reference: string; // unique GL reference for this payment
  date: string;
  amount: number;
  method: string;
}

/** Post a customer payment: Dr Cash/Bank (by method), Cr Trade Receivables. */
export async function postInvoicePayment(tx: Tx, tenantId: string, ctx: RequestContext, input: InvoicePaymentJournalInput): Promise<void> {
  const acc = paymentAccount(input.method);
  await ensureCoaAccount(tx, tenantId, acc.code, acc.name, "Asset", "1100");
  const lines: JournalLineInput[] = [
    { accountCode: acc.code, accountName: acc.name, debit: input.amount, credit: 0 },
    { accountCode: "1200", accountName: "Trade Receivables", debit: 0, credit: input.amount },
  ];
  assertBalanced(lines);
  await applyJournalEntry(tx, tenantId, ctx, {
    lines,
    narration: `Payment for ${input.invoiceNumber}`,
    reference: input.reference,
    date: input.date,
  });
}

// ===================================================================
// Expenses
// ===================================================================

export interface ExpenseJournalInput {
  reference: string;
  date: string;
  amount: number; // VAT-inclusive gross paid
  vat?: number; // recoverable input VAT contained in `amount` (0 = none)
  categoryCode: string; // expense COA account
  categoryName: string;
  paymentMethod: string; // cash | mpesa | bank | credit
}

/**
 * Post an expense: Dr expense category (net) + recoverable input VAT (1250), Cr cash/bank (by method)
 * or Trade Payables (credit) for the gross. With no VAT it collapses to Dr expense / Cr payment.
 */
export async function postExpense(tx: Tx, tenantId: string, ctx: RequestContext, input: ExpenseJournalInput): Promise<void> {
  const vat = input.vat && input.vat > 0 ? round2(input.vat) : 0;
  const net = round2(input.amount - vat);
  const credit =
    input.paymentMethod === "credit"
      ? { code: "2100", name: "Trade Payables" }
      : paymentAccount(input.paymentMethod);
  if (input.paymentMethod !== "credit") {
    await ensureCoaAccount(tx, tenantId, credit.code, credit.name, "Asset", "1100");
  }
  if (vat > 0) await ensureCoaAccount(tx, tenantId, "1250", "Input VAT Recoverable", "Asset", "1000", 1);
  const lines: JournalLineInput[] = [
    { accountCode: input.categoryCode, accountName: input.categoryName, debit: net, credit: 0 },
    ...(vat > 0 ? [{ accountCode: "1250", accountName: "Input VAT Recoverable", debit: vat, credit: 0 }] : []),
    { accountCode: credit.code, accountName: credit.name, debit: 0, credit: input.amount },
  ];
  assertBalanced(lines);
  await applyJournalEntry(tx, tenantId, ctx, {
    lines,
    narration: `Expense — ${input.categoryName}`,
    reference: input.reference,
    date: input.date,
  });
}

// ===================================================================
// Payroll
// ===================================================================

export interface PayrollJournalInput {
  period: string;
  reference: string;
  date: string;
  gross: number;
  paye: number;
  nssfEmployee: number;
  nssfEmployer: number;
  sdl: number;
  wcf: number;
  heslb: number;
}

/**
 * Post a payroll run:
 *   Dr Staff Costs (6100)              gross + employer NSSF + SDL + WCF
 *     Cr Tax Payable (2200)            PAYE
 *     Cr Statutory Payables (2150)     NSSF (both) + SDL + WCF + HESLB
 *     Cr Bank (1110)                   net pay (balancing figure = staff cost − PAYE − statutory)
 * Net pay is the balancing figure so the journal always ties (it equals gross − PAYE − employee-NSSF − HESLB).
 */
// ===================================================================
// Fixed assets
// ===================================================================

export interface AssetAcquisitionInput {
  code: string;
  name: string;
  date: string;
  cost: number;
  paymentMethod: string; // cash | mpesa | bank | credit
}

/** Post an asset acquisition: Dr PP&E (1500), Cr cash/bank (by method) or Trade Payables (credit). */
export async function postAssetAcquisition(tx: Tx, tenantId: string, ctx: RequestContext, i: AssetAcquisitionInput): Promise<void> {
  const credit = i.paymentMethod === "credit" ? { code: "2100", name: "Trade Payables" } : paymentAccount(i.paymentMethod);
  if (i.paymentMethod !== "credit") await ensureCoaAccount(tx, tenantId, credit.code, credit.name, "Asset", "1100");
  const lines: JournalLineInput[] = [
    { accountCode: "1500", accountName: "Property, Plant & Equipment", debit: i.cost, credit: 0 },
    { accountCode: credit.code, accountName: credit.name, debit: 0, credit: i.cost },
  ];
  assertBalanced(lines);
  await applyJournalEntry(tx, tenantId, ctx, { lines, narration: `Acquired ${i.name} (${i.code})`, reference: `FA-ACQ-${i.code}`, date: i.date });
}

/** Post a period's depreciation charge: Dr Depreciation (6300), Cr Accumulated Depreciation (1590). */
export async function postDepreciation(tx: Tx, tenantId: string, ctx: RequestContext, i: { period: string; date: string; amount: number }): Promise<void> {
  await ensureCoaAccount(tx, tenantId, "1590", "Accumulated Depreciation", "Asset", "1000", 1);
  const lines: JournalLineInput[] = [
    { accountCode: "6300", accountName: "Depreciation", debit: i.amount, credit: 0 },
    { accountCode: "1590", accountName: "Accumulated Depreciation", debit: 0, credit: i.amount },
  ];
  assertBalanced(lines);
  await applyJournalEntry(tx, tenantId, ctx, { lines, narration: `Depreciation ${i.period}`, reference: `DEP-${i.period}`, date: i.date });
}

// ===================================================================
// Procurement (supplier bills & payments)
// ===================================================================

/** Post a supplier bill on receipt: Dr Inventory (1300) + recoverable input VAT (1250), Cr Trade Payables (2100). */
export async function postSupplierBill(tx: Tx, tenantId: string, ctx: RequestContext, i: { reference: string; date: string; net: number; vat: number }): Promise<void> {
  const total = round2(i.net + i.vat);
  if (i.vat > 0) await ensureCoaAccount(tx, tenantId, "1250", "Input VAT Recoverable", "Asset", "1000", 1);
  const lines: JournalLineInput[] = [
    { accountCode: "1300", accountName: "Inventory", debit: i.net, credit: 0 },
    ...(i.vat > 0 ? [{ accountCode: "1250", accountName: "Input VAT Recoverable", debit: i.vat, credit: 0 }] : []),
    { accountCode: "2100", accountName: "Trade Payables", debit: 0, credit: total },
  ];
  assertBalanced(lines);
  await applyJournalEntry(tx, tenantId, ctx, { lines, narration: `Supplier bill ${i.reference}`, reference: i.reference, date: i.date });
}

/** Post a supplier payment: Dr Trade Payables (2100), Cr cash/bank (by method). */
export async function postSupplierPayment(tx: Tx, tenantId: string, ctx: RequestContext, i: { reference: string; date: string; amount: number; method: string }): Promise<void> {
  const acc = paymentAccount(i.method);
  await ensureCoaAccount(tx, tenantId, acc.code, acc.name, "Asset", "1100");
  const lines: JournalLineInput[] = [
    { accountCode: "2100", accountName: "Trade Payables", debit: i.amount, credit: 0 },
    { accountCode: acc.code, accountName: acc.name, debit: 0, credit: i.amount },
  ];
  assertBalanced(lines);
  await applyJournalEntry(tx, tenantId, ctx, { lines, narration: `Supplier payment ${i.reference}`, reference: i.reference, date: i.date });
}

// ===================================================================
// Tax remittance
// ===================================================================

/** Post a tax remittance: Dr the payable (VAT → Tax Payable 2200; all other taxes → Statutory Payables 2150), Cr bank. */
export async function postTaxRemittance(tx: Tx, tenantId: string, ctx: RequestContext, i: { reference: string; date: string; amount: number; taxType: string }): Promise<void> {
  const isVat = i.taxType === "VAT";
  const payable = isVat ? { code: "2200", name: "Tax Payable" } : { code: "2150", name: "Statutory Payables" };
  if (!isVat) await ensureCoaAccount(tx, tenantId, "2150", "Statutory Payables", "Liability", "2000", 1);
  const lines: JournalLineInput[] = [
    { accountCode: payable.code, accountName: payable.name, debit: i.amount, credit: 0 },
    { accountCode: "1110", accountName: "CRDB TZS Account", debit: 0, credit: i.amount },
  ];
  assertBalanced(lines);
  await applyJournalEntry(tx, tenantId, ctx, { lines, narration: `${i.taxType} remittance ${i.reference}`, reference: i.reference, date: i.date });
}

export async function postPayrollRun(tx: Tx, tenantId: string, ctx: RequestContext, p: PayrollJournalInput): Promise<void> {
  await ensureCoaAccount(tx, tenantId, "2150", "Statutory Payables", "Liability", "2000", 1);
  const staffCost = round2(p.gross + p.nssfEmployer + p.sdl + p.wcf);
  // PAYE + NSSF + SDL + WCF + HESLB all sit in Statutory Payables (2150) — 2200 stays pure output VAT.
  const statutory = round2(p.paye + p.nssfEmployee + p.nssfEmployer + p.sdl + p.wcf + p.heslb);
  const net = round2(staffCost - statutory);
  const lines: JournalLineInput[] = [
    { accountCode: "6100", accountName: "Staff Costs", debit: staffCost, credit: 0 },
    ...(statutory > 0 ? [{ accountCode: "2150", accountName: "Statutory Payables", debit: 0, credit: statutory }] : []),
    ...(net > 0 ? [{ accountCode: "1110", accountName: "CRDB TZS Account", debit: 0, credit: net }] : []),
  ];
  assertBalanced(lines);
  await applyJournalEntry(tx, tenantId, ctx, {
    lines,
    narration: `Payroll ${p.period}`,
    reference: p.reference,
    date: p.date,
  });
}
