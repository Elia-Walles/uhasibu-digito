import { describe, it, expect } from "vitest";
import { nextRunFrom } from "@/lib/server/recurring-run";

const base = new Date(2026, 0, 15); // 15 Jan 2026
const ymd = (d: Date) => [d.getFullYear(), d.getMonth(), d.getDate()];

describe("recurring next-run schedule", () => {
  it("advances by frequency", () => {
    expect(ymd(nextRunFrom(base, "Weekly", 1))).toEqual([2026, 0, 22]);
    expect(ymd(nextRunFrom(base, "Monthly", 1))).toEqual([2026, 1, 15]);
    expect(ymd(nextRunFrom(base, "Quarterly", 1))).toEqual([2026, 3, 15]);
    expect(ymd(nextRunFrom(base, "Yearly", 1))).toEqual([2027, 0, 15]);
  });

  it("honours the interval multiplier", () => {
    expect(ymd(nextRunFrom(base, "Monthly", 2))).toEqual([2026, 2, 15]);
    expect(ymd(nextRunFrom(base, "Weekly", 3))).toEqual([2026, 1, 5]); // +21 days
  });

  it("defaults an unknown frequency to monthly", () => {
    expect(ymd(nextRunFrom(base, "Fortnightly", 1))).toEqual([2026, 1, 15]);
  });
});
