import type { AssetCategory } from "@/types";

export interface StandardRate {
  slPct: number;
  rbPct: number;
  usefulLife: number;
  basis: string;
}

/**
 * TRA / NBAA-aligned default depreciation rates by asset class.
 * Illustrative — final rates must be verified with a tax advisor for any
 * specific engagement. Surface this caveat in any UI that uses these values.
 */
export const STANDARD_RATES: Record<AssetCategory, StandardRate> = {
  Building:  { slPct: 0.05,  rbPct: 0.05,  usefulLife: 20, basis: "TRA Class 6 / NBAA guideline" },
  Vehicle:   { slPct: 0.20,  rbPct: 0.25,  usefulLife: 5,  basis: "TRA Class 2" },
  Equipment: { slPct: 0.125, rbPct: 0.25,  usefulLife: 8,  basis: "TRA Class 3" },
  Computer:  { slPct: 0.25,  rbPct: 0.375, usefulLife: 4,  basis: "TRA Class 4" },
  Furniture: { slPct: 0.125, rbPct: 0.25,  usefulLife: 8,  basis: "TRA Class 3" },
};
