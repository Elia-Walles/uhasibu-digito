import type { db } from "./db";
import type { RequestContext } from "./request-context";
import { applyJournalEntry, reverseJournalEntry } from "./journal-posting";
import type { PaymentMethod } from "@/types";

// The interactive-transaction client for the extended `db`.
type Tx = Omit<typeof db, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export const VAT_RATE = 0.18;

/** COA account each payment method debits (the cash/receivable side of the sale). */
const PAY_ACCOUNT: Record<PaymentMethod, { code: string; name: string }> = {
  cash: { code: "1140", name: "Cash on Hand" },
  mpesa: { code: "1150", name: "Mobile Money (M-Pesa)" },
  card: { code: "1110", name: "CRDB TZS Account" },
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Split a VAT-inclusive gross total into net + 18% VAT (Tanzanian retail prices are inclusive). */
export function splitInclusiveVat(total: number): { net: number; vat: number } {
  const net = round2(total / (1 + VAT_RATE));
  return { net, vat: round2(total - net) };
}

/** EFD receipt number in the TRA format EFD-YYYY-XXXXXXXX. */
export function efdNumber(seq: number, year: number): string {
  return `EFD-${year}-${String(seq).padStart(8, "0")}`;
}

/** Find-or-create a postable COA account for the tenant (used for cash/M-Pesa, not in the
 *  default seed for older tenants). */
async function ensureCoaAccount(tx: Tx, tenantId: string, code: string, name: string): Promise<void> {
  const existing = await tx.cOAAccount.findFirst({ where: { code, tenantId } });
  if (existing) return;
  await tx.cOAAccount.create({
    data: { tenantId, code, name, type: "Asset", parentCode: "1100", level: 2 },
  });
}

export interface POSJournalInput {
  receiptNumber: string;
  date: string; // YYYY-MM-DD
  net: number;
  vat: number;
  total: number;
  costOfSales: number;
  paymentMethod: PaymentMethod;
}

/**
 * Post a POS sale to the General Ledger, balanced:
 *   Dr payment account (cash/M-Pesa/card)  total
 *     Cr Sales Revenue (4100)               net
 *     Cr Tax Payable (2200)                 vat
 *   Dr Cost of Sales (5000)                 costOfSales
 *     Cr Inventory (1300)                   costOfSales
 * Reference = receiptNumber, so a refund can reverse it via reverseJournalEntry.
 */
export async function postPOSSaleJournal(tx: Tx, tenantId: string, ctx: RequestContext, input: POSJournalInput): Promise<void> {
  const pay = PAY_ACCOUNT[input.paymentMethod];
  await ensureCoaAccount(tx, tenantId, pay.code, pay.name);

  const lines = [
    { accountCode: pay.code, accountName: pay.name, debit: input.total, credit: 0 },
    { accountCode: "4100", accountName: "Sales Revenue", debit: 0, credit: input.net },
    ...(input.vat > 0 ? [{ accountCode: "2200", accountName: "Tax Payable", debit: 0, credit: input.vat }] : []),
    ...(input.costOfSales > 0
      ? [
          { accountCode: "5000", accountName: "Cost of Sales", debit: input.costOfSales, credit: 0 },
          { accountCode: "1300", accountName: "Inventory", debit: 0, credit: input.costOfSales },
        ]
      : []),
  ];

  await applyJournalEntry(tx, tenantId, ctx, {
    lines,
    narration: `POS sale ${input.receiptNumber}`,
    reference: input.receiptNumber,
    date: input.date,
  });
}

/** Undo a POS sale's GL entry (and any bank mirror) on refund. */
export async function reversePOSSaleJournal(tx: Tx, tenantId: string, reference: string): Promise<void> {
  await reverseJournalEntry(tx, tenantId, reference);
}

export interface OutputVatInput {
  date: string; // YYYY-MM-DD
  reference: string;
  description: string;
  net: number;
  vat: number;
}

function periodOf(date: string): string {
  return date.slice(0, 7); // YYYY-MM
}

/** Record output VAT on a sale into the period's VAT return (find-or-create) + a transaction. */
export async function postOutputVat(tx: Tx, tenantId: string, input: OutputVatInput): Promise<void> {
  if (input.vat <= 0) return;
  const period = periodOf(input.date);
  const existing = await tx.vATReturn.findFirst({ where: { tenantId, period } });
  const ret = existing
    ? await tx.vATReturn.update({
        where: { id: existing.id },
        data: {
          outputVAT: Number(existing.outputVAT) + input.vat,
          vatPayable: Number(existing.outputVAT) + input.vat - Number(existing.inputVAT),
        },
      })
    : await tx.vATReturn.create({
        data: { tenantId, period, outputVAT: input.vat, inputVAT: 0, vatPayable: input.vat },
      });

  await tx.vATTransaction.create({
    data: {
      tenantId,
      vatReturnId: ret.id,
      direction: "Output",
      date: new Date(input.date),
      reference: input.reference,
      description: input.description,
      netAmount: input.net,
      vatRate: VAT_RATE * 100,
      vatAmount: input.vat,
    },
  });
}

/** Record input (recoverable) VAT on a purchase into the period's VAT return + an Input transaction. */
export async function postInputVat(tx: Tx, tenantId: string, input: OutputVatInput): Promise<void> {
  if (input.vat <= 0) return;
  const period = periodOf(input.date);
  const existing = await tx.vATReturn.findFirst({ where: { tenantId, period } });
  const ret = existing
    ? await tx.vATReturn.update({
        where: { id: existing.id },
        data: {
          inputVAT: Number(existing.inputVAT) + input.vat,
          vatPayable: Number(existing.outputVAT) - (Number(existing.inputVAT) + input.vat),
        },
      })
    : await tx.vATReturn.create({
        data: { tenantId, period, outputVAT: 0, inputVAT: input.vat, vatPayable: -input.vat },
      });

  await tx.vATTransaction.create({
    data: {
      tenantId,
      vatReturnId: ret.id,
      direction: "Input",
      date: new Date(input.date),
      reference: input.reference,
      description: input.description,
      netAmount: input.net,
      vatRate: VAT_RATE * 100,
      vatAmount: input.vat,
    },
  });
}

/** Back out input VAT when a purchase/expense is deleted: negate the return totals + reversing txn. */
export async function reverseInputVat(tx: Tx, tenantId: string, input: OutputVatInput): Promise<void> {
  if (input.vat <= 0) return;
  const period = periodOf(input.date);
  const ret = await tx.vATReturn.findFirst({ where: { tenantId, period } });
  if (!ret) return;
  const newInput = Number(ret.inputVAT) - input.vat;
  await tx.vATReturn.update({
    where: { id: ret.id },
    data: { inputVAT: newInput, vatPayable: Number(ret.outputVAT) - newInput },
  });
  await tx.vATTransaction.create({
    data: {
      tenantId,
      vatReturnId: ret.id,
      direction: "Input",
      date: new Date(input.date),
      reference: input.reference,
      description: `Reversal · ${input.description}`,
      netAmount: -input.net,
      vatRate: VAT_RATE * 100,
      vatAmount: -input.vat,
    },
  });
}

/** Back out output VAT on refund: negate the return totals and record a reversing transaction. */
export async function reverseOutputVat(tx: Tx, tenantId: string, input: OutputVatInput): Promise<void> {
  if (input.vat <= 0) return;
  const period = periodOf(input.date);
  const ret = await tx.vATReturn.findFirst({ where: { tenantId, period } });
  if (!ret) return;
  const newOutput = Number(ret.outputVAT) - input.vat;
  await tx.vATReturn.update({
    where: { id: ret.id },
    data: { outputVAT: newOutput, vatPayable: newOutput - Number(ret.inputVAT) },
  });
  await tx.vATTransaction.create({
    data: {
      tenantId,
      vatReturnId: ret.id,
      direction: "Output",
      date: new Date(input.date),
      reference: input.reference,
      description: `Refund · ${input.description}`,
      netAmount: -input.net,
      vatRate: VAT_RATE * 100,
      vatAmount: -input.vat,
    },
  });
}
