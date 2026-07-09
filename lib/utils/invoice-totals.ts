// Single source of truth for invoice line + total math, shared by the client preview
// (sales/new-invoice) and the createInvoice server action (which never trusts
// client-supplied totals). VAT is Tanzania's standard 18%, applied per line (exclusive) so
// a line can be zero-rated/exempt by setting its vatPct to 0.
export const VAT_RATE = 0.18;

export interface LineInput {
  quantity: number;
  unitPrice: number;
  discountPct: number;
  vatPct?: number;
}

export interface InvoiceTotals {
  lineTotals: number[]; // net of line discount, excl. VAT
  subtotal: number; // sum of lineTotals
  vatAmount: number; // sum of per-line VAT
  total: number; // subtotal + VAT
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Net line amount: qty × price, less the line discount %. Excludes VAT. */
export function computeLineTotal(line: LineInput): number {
  const gross = line.quantity * line.unitPrice;
  return round2(gross - gross * (line.discountPct / 100));
}

export function computeInvoiceTotals(lines: LineInput[]): InvoiceTotals {
  const lineTotals = lines.map(computeLineTotal);
  const subtotal = round2(lineTotals.reduce((sum, n) => sum + n, 0));
  const vatAmount = round2(
    lines.reduce((sum, l, i) => sum + (lineTotals[i] ?? 0) * ((l.vatPct ?? 18) / 100), 0),
  );
  return { lineTotals, subtotal, vatAmount, total: round2(subtotal + vatAmount) };
}

// ---------- Amount in words (for invoice footer) ----------

const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const SCALES = ["", "thousand", "million", "billion", "trillion"];

function threeDigitsToWords(n: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds) parts.push(`${ONES[hundreds]} hundred`);
  if (rest < 20) {
    if (rest) parts.push(ONES[rest]!);
  } else {
    const t = Math.floor(rest / 10);
    const o = rest % 10;
    parts.push(o ? `${TENS[t]}-${ONES[o]}` : TENS[t]!);
  }
  return parts.join(" ");
}

function integerToWords(n: number): string {
  if (n === 0) return "zero";
  const groups: number[] = [];
  let rem = n;
  while (rem > 0) {
    groups.push(rem % 1000);
    rem = Math.floor(rem / 1000);
  }
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    const g = groups[i]!;
    if (g === 0) continue;
    parts.push(`${threeDigitsToWords(g)}${SCALES[i] ? ` ${SCALES[i]}` : ""}`);
  }
  return parts.join(" ");
}

/** "TZS 1,180" → "One thousand one hundred eighty Tanzanian Shillings". */
export function currencyToWords(amount: number, currency = "Tanzanian Shillings"): string {
  const whole = Math.floor(Math.abs(amount));
  const cents = Math.round((Math.abs(amount) - whole) * 100);
  const words = integerToWords(whole);
  const cap = words.charAt(0).toUpperCase() + words.slice(1);
  const centsPart = cents > 0 ? ` and ${cents}/100` : "";
  return `${cap}${centsPart} ${currency}`;
}
