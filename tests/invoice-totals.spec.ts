import { describe, it, expect } from "vitest";
import { computeInvoiceTotals, computeLineTotal } from "@/lib/utils/invoice-totals";

describe("invoice totals", () => {
  it("computes a line total with and without discount", () => {
    expect(computeLineTotal({ quantity: 2, unitPrice: 1000, discountPct: 0 })).toBe(2000);
    expect(computeLineTotal({ quantity: 2, unitPrice: 1000, discountPct: 10 })).toBe(1800);
  });

  it("sums subtotal, applies 18% VAT (rounded), and totals", () => {
    const t = computeInvoiceTotals([
      { quantity: 1, unitPrice: 1000, discountPct: 0 },
      { quantity: 3, unitPrice: 500, discountPct: 0 },
    ]);
    expect(t.lineTotals).toEqual([1000, 1500]);
    expect(t.subtotal).toBe(2500);
    expect(t.vatAmount).toBe(450);
    expect(t.total).toBe(2950);
  });

  it("computes per-line VAT to two decimals", () => {
    const t = computeInvoiceTotals([{ quantity: 1, unitPrice: 333, discountPct: 0 }]);
    expect(t.vatAmount).toBe(59.94); // 333 × 18%, rounded to 2dp (single source of truth)
    expect(t.total).toBe(392.94);
  });
});
