import { z } from "zod";

// ModelAssumptions live only in client state (the modeling page's Zustand store) they are
// never persisted to the DB, so the model-export action receives them in the call and
// validates here before building the workbook server-side.
export const modelAssumptionsSchema = z.object({
  scenario: z.enum(["Base", "Upside", "Downside"]),
  inflationRate: z.number(),
  fxTzsPerUsd: z.number(),
  revenueGrowth: z.number(),
  grossMarginTarget: z.number(),
  opexGrowth: z.number(),
  capexAnnual: z.number(),
  taxRate: z.number(),
  primaryProducts: z.string(),
});
