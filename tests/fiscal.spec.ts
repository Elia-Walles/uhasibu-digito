import { describe, it, expect } from "vitest";
import { fiscalYearBounds, priorFiscalYearBounds, fiscalQuarterBounds } from "@/lib/server/fiscal";

describe("fiscal year bounds", () => {
  it("a January start behaves like the calendar year", () => {
    const fy = fiscalYearBounds(new Date(2026, 5, 15), 1);
    expect([fy.fyStart.getFullYear(), fy.fyStart.getMonth(), fy.fyStart.getDate()]).toEqual([2026, 0, 1]);
    expect([fy.fyEnd.getFullYear(), fy.fyEnd.getMonth(), fy.fyEnd.getDate()]).toEqual([2026, 11, 31]);
    expect(fy.label).toBe("FY 2026");
  });

  it("a July start straddles two calendar years (date after the start month)", () => {
    const fy = fiscalYearBounds(new Date(2026, 7, 1), 7); // August 2026
    expect([fy.fyStart.getFullYear(), fy.fyStart.getMonth(), fy.fyStart.getDate()]).toEqual([2026, 6, 1]);
    expect([fy.fyEnd.getFullYear(), fy.fyEnd.getMonth(), fy.fyEnd.getDate()]).toEqual([2027, 5, 30]);
    expect(fy.label).toBe("FY 2026/27");
  });

  it("a July start rolls back a year for dates before the start month", () => {
    const fy = fiscalYearBounds(new Date(2026, 3, 1), 7); // April 2026 → FY 2025/26
    expect([fy.fyStart.getFullYear(), fy.fyStart.getMonth()]).toEqual([2025, 6]);
    expect([fy.fyEnd.getFullYear(), fy.fyEnd.getMonth()]).toEqual([2026, 5]);
  });

  it("prior fiscal year is exactly one year earlier", () => {
    const prior = priorFiscalYearBounds(new Date(2026, 5, 15), 1);
    expect(prior.fyStart.getFullYear()).toBe(2025);
    expect(prior.label).toBe("FY 2025");
  });

  it("splits a calendar fiscal year into four quarters", () => {
    const fyStart = new Date(2026, 0, 1);
    const q1 = fiscalQuarterBounds(fyStart, 1);
    const q4 = fiscalQuarterBounds(fyStart, 4);
    expect([q1.start.getMonth(), q1.end.getMonth(), q1.end.getDate()]).toEqual([0, 2, 31]);
    expect([q4.start.getMonth(), q4.end.getMonth(), q4.end.getDate()]).toEqual([9, 11, 31]);
  });
});
