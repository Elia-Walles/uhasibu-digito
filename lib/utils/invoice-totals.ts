// Single source of truth for invoice line + total math, shared by the client preview
// (sales/new-invoice) and the createInvoice server action (which never trusts
// client-supplied totals). VAT is Tanzania's standard 18%.
export const VAT_RATE = 0.18;

export interface LineInput {
  quantity: number;
  unitPrice: number;
  discountPct: number;
}

export interface InvoiceTotals {
  lineTotals: number[];
  subtotal: number;
  vatAmount: number;
  total: number;
}

export function computeLineTotal(line: LineInput): number {
  const gross = line.quantity * line.unitPrice;
  return gross - gross * (line.discountPct / 100);
}

export function computeInvoiceTotals(lines: LineInput[]): InvoiceTotals {
  const lineTotals = lines.map(computeLineTotal);
  const subtotal = lineTotals.reduce((sum, n) => sum + n, 0);
  const vatAmount = Math.round(subtotal * VAT_RATE);
  return { lineTotals, subtotal, vatAmount, total: subtotal + vatAmount };
}
