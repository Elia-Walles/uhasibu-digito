import { describe, it, expect } from "vitest";
import { splitInclusiveVat } from "@/lib/server/pos-posting";

describe("inclusive VAT split (18%)", () => {
  it("splits a VAT-inclusive gross into net + VAT", () => {
    expect(splitInclusiveVat(1180)).toEqual({ net: 1000, vat: 180 });
    expect(splitInclusiveVat(118)).toEqual({ net: 100, vat: 18 });
  });

  it("net + VAT always reconstructs the gross", () => {
    for (const gross of [999, 1234, 50_000, 1_999_999]) {
      const { net, vat } = splitInclusiveVat(gross);
      expect(Math.round((net + vat) * 100) / 100).toBe(gross);
    }
  });
});
