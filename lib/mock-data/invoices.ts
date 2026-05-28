import type { Invoice, InvoiceStatus, InvoiceLine } from "@/types";
import { rngFromSeed, range, randomInt, randomTZS, isoDate, efdFormat, pick } from "./generators";
import { CUSTOMERS } from "./customers";

const rnd = rngFromSeed(424242);

const STATUS_BUCKETS: InvoiceStatus[] = [
  ...range(40, () => "Paid"      as InvoiceStatus),
  ...range(30, () => "Sent"      as InvoiceStatus),
  ...range(20, () => "Overdue"   as InvoiceStatus),
  ...range(8,  () => "Draft"     as InvoiceStatus),
  ...range(2,  () => "Cancelled" as InvoiceStatus),
];

const LINE_DESCRIPTIONS = [
  "Bulk delivery — order","Monthly retainer","Service supply","Goods shipment",
  "Quarterly contract","Bulk wholesale","Branch supply","Project delivery",
];

function makeLines(count: number): InvoiceLine[] {
  return range(count, (i) => {
    const qty = randomInt(1, 80, rnd);
    const unitPrice = randomTZS(15_000, 350_000, rnd);
    const discountPct = randomInt(0, 100, rnd) > 80 ? 5 : 0;
    const vatPct = 18;
    const subtotal = qty * unitPrice;
    const lineTotal = subtotal - subtotal * (discountPct / 100);
    return {
      id: `line_${i + 1}`,
      description: `${pick(LINE_DESCRIPTIONS, rnd)} #${i + 1}`,
      quantity: qty,
      unitPrice,
      discountPct,
      vatPct,
      lineTotal,
    };
  });
}

export const INVOICES: Invoice[] = range(120, (i) => {
  const customer = CUSTOMERS[i % CUSTOMERS.length]!;
  const issue = new Date(2024, randomInt(0, 9, rnd), randomInt(1, 28, rnd));
  const due   = new Date(issue);
  due.setDate(due.getDate() + 30);
  const lines = makeLines(randomInt(1, 5, rnd));
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const discount = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.discountPct / 100), 0);
  const vatAmount = Math.round(subtotal * 0.18);
  const total = subtotal + vatAmount;
  const status = STATUS_BUCKETS[i] ?? "Sent";
  const inv: Invoice = {
    id: `inv_${String(i + 1).padStart(3, "0")}`,
    number: `INV-2024-${String(1000 + i).padStart(5, "0")}`,
    customerId: customer.id,
    customerName: customer.name,
    issueDate: isoDate(issue),
    dueDate: isoDate(due),
    lines,
    subtotal,
    discount,
    vatAmount,
    total,
    status,
    efdNumber: efdFormat(i + 1),
    notes: "Payment is due 30 days from invoice date. Bank: CRDB 0150123456789",
  };
  if (status === "Paid") inv.paidAt = isoDate(new Date(issue.getTime() + 5 * 86400000));
  return inv;
});
