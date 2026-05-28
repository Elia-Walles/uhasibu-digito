import type { Supplier, PurchaseOrder, POStatus, POLine } from "@/types";
import {
  rngFromSeed,
  pick,
  range,
  randomInt,
  randomTZS,
  isoDate,
  tinFormat,
  phoneFormat,
  TZ_COMPANY_PREFIX,
  TZ_COMPANY_SUFFIX,
  TZ_CITIES,
  TZ_FIRST_NAMES,
  TZ_LAST_NAMES,
  TZ_BANKS,
  PAYMENT_TERMS,
} from "./generators";

const rnd = rngFromSeed(98765);

export const SUPPLIERS: Supplier[] = range(25, (i) => {
  const prefix = TZ_COMPANY_PREFIX[(i + 8) % TZ_COMPANY_PREFIX.length] ?? "Supplier Co";
  const fn = pick(TZ_FIRST_NAMES, rnd);
  const ln = pick(TZ_LAST_NAMES, rnd);
  const city = pick(TZ_CITIES, rnd);
  return {
    id: `sup_${String(i + 1).padStart(3, "0")}`,
    name: `${prefix} ${pick(TZ_COMPANY_SUFFIX, rnd)}`,
    contactPerson: `${fn} ${ln}`,
    tin: tinFormat(rnd),
    phone: phoneFormat(rnd),
    email: `${prefix.toLowerCase().replace(/[^a-z]+/g, "")}@example.co.tz`,
    city,
    address: `${randomInt(1, 600, rnd)} ${pick(["Industrial","Uhuru","Sokoine","Bagamoyo"], rnd)} Rd, ${city}`,
    paymentTerms: pick(PAYMENT_TERMS, rnd),
    outstandingBalance: randomTZS(0, 25_000_000, rnd),
    creditLimit: randomTZS(10_000_000, 80_000_000, rnd),
    performanceRating: 3 + Math.floor(rnd() * 3), // 3..5
    bankName: pick(TZ_BANKS, rnd),
    bankAccount: `${1000000000 + i * 87654}`,
  };
});

const PO_STATUS_BUCKETS: POStatus[] = [
  ...range(20, () => "Received" as POStatus),
  ...range(25, () => "Sent"     as POStatus),
  ...range(10, () => "Draft"    as POStatus),
  ...range(5,  () => "Cancelled" as POStatus),
];

function makePOLines(count: number): POLine[] {
  return range(count, (i) => {
    const qty = randomInt(5, 200, rnd);
    const unitPrice = randomTZS(20_000, 250_000, rnd);
    return {
      id: `pol_${i + 1}`,
      description: `${pick(["Inventory restock","Office supplies","Maintenance parts","Equipment"], rnd)} batch ${i + 1}`,
      quantity: qty,
      unitPrice,
      lineTotal: qty * unitPrice,
    };
  });
}

export const PURCHASE_ORDERS: PurchaseOrder[] = range(60, (i) => {
  const supplier = SUPPLIERS[i % SUPPLIERS.length]!;
  const date = new Date(2024, randomInt(0, 9, rnd), randomInt(1, 28, rnd));
  const expected = new Date(date);
  expected.setDate(expected.getDate() + 14);
  const lines = makePOLines(randomInt(1, 4, rnd));
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const vatAmount = Math.round(subtotal * 0.18);
  const status = PO_STATUS_BUCKETS[i] ?? "Sent";
  const received = status === "Received";
  return {
    id: `po_${String(i + 1).padStart(3, "0")}`,
    number: `PO-2024-${String(100 + i).padStart(5, "0")}`,
    supplierId: supplier.id,
    supplierName: supplier.name,
    date: isoDate(date),
    expectedDelivery: isoDate(expected),
    lines,
    subtotal,
    vatAmount,
    total: subtotal + vatAmount,
    status,
    matchStatus: {
      poConfirmed: status !== "Draft",
      grnReceived: received,
      invoiceReceived: received,
    },
  };
});
