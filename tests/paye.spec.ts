import { describe, it, expect } from "vitest";
import { calculatePAYE, calculateDeductions } from "@/lib/utils/paye";

describe("PAYE bands (TRA monthly)", () => {
  it("is zero up to the 270,000 threshold", () => {
    expect(calculatePAYE(0)).toBe(0);
    expect(calculatePAYE(270_000)).toBe(0);
  });

  it("taxes each band at its marginal rate at the boundaries", () => {
    expect(calculatePAYE(520_000)).toBe(20_000); // 250k @ 8%
    expect(calculatePAYE(760_000)).toBe(68_000); // + 240k @ 20%
    expect(calculatePAYE(1_000_000)).toBe(128_000); // + 240k @ 25%
    expect(calculatePAYE(1_500_000)).toBe(278_000); // + 500k @ 30%
  });
});

describe("statutory deductions", () => {
  it("computes NSSF/SDL/WCF and net pay without HESLB", () => {
    const d = calculateDeductions(1_000_000);
    expect(d.paye).toBe(128_000);
    expect(d.nssf_employee).toBe(100_000);
    expect(d.nssf_employer).toBe(100_000);
    expect(d.sdl).toBe(40_000);
    expect(d.wcf).toBe(5_000);
    expect(d.heslb).toBe(0);
    expect(d.netPay).toBe(772_000);
  });

  it("applies HESLB when flagged", () => {
    const d = calculateDeductions(1_000_000, true);
    expect(d.heslb).toBe(25_000);
    expect(d.netPay).toBe(747_000);
  });
});
