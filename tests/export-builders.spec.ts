import { describe, it, expect } from "vitest";
import { workbookToBase64 } from "@/lib/utils/excel-build";
import { buildDepreciationWorkbook } from "@/lib/utils/depreciation-export";
import { buildAuditWorkbook } from "@/lib/utils/audit-export";
import { buildModelWorkbook } from "@/lib/utils/model-export";
import type {
  FixedAsset,
  AuditEngagement,
  AuditProcedure,
  AuditProcedureState,
  ModelAssumptions,
} from "@/types";

// Always-on unit gate for the Wave 11 server-safe xlsx builders. These run with no DOM and
// no DB exactly what the export Server Actions call so a green run proves the builders
// are server-safe and produce a real workbook. Asserts sheet structure + a non-empty buffer.

const SAMPLE_ASSETS: FixedAsset[] = [
  {
    id: "fa_test_1", code: "VEH-001", name: "Test Truck", category: "Vehicle", location: "HQ",
    acquisitionDate: "2023-01-01", cost: 100_000_000, residualValue: 10_000_000, usefulLifeYears: 5,
    depreciationMethod: "StraightLine", accumulatedDepreciation: 40_000_000, netBookValue: 60_000_000,
    status: "Active",
  },
  {
    id: "fa_test_2", code: "EQP-001", name: "Test Press", category: "Equipment", location: "Plant",
    acquisitionDate: "2022-06-01", cost: 50_000_000, residualValue: 0, usefulLifeYears: 4,
    depreciationMethod: "StraightLine", accumulatedDepreciation: 50_000_000, netBookValue: 0,
    status: "Disposed", disposalDate: "2024-12-01", disposalProceeds: 8_000_000, gainLoss: 8_000_000,
  },
];

const SAMPLE_ENGAGEMENT: AuditEngagement = {
  name: "Test Engagement FY24",
  period: "01 Jan 2024 – 31 Dec 2024",
  auditorName: "Tester",
};

const SAMPLE_AUDIT_STATE: Record<AuditProcedure, AuditProcedureState> = {
  Expenses: { results: { exp_capture: { status: "Passed", notes: "Sampled 10 vouchers" } } },
  Purchases: { results: { pur_grn: { status: "Exception", notes: "Two GRNs missing" } } },
  Sales: { results: {} },
};

const SAMPLE_ASSUMPTIONS: ModelAssumptions = {
  scenario: "Base",
  inflationRate: 0.035,
  fxTzsPerUsd: 2580,
  revenueGrowth: 0.12,
  grossMarginTarget: 0.51,
  opexGrowth: 0.08,
  capexAnnual: 62_500_000,
  taxRate: 0.3,
  primaryProducts: "Wholesale FMCG",
};

async function names(wb: { worksheets: { name: string }[] }): Promise<string[]> {
  return wb.worksheets.map((ws) => ws.name);
}

describe("Wave 11 xlsx builders (server-safe)", () => {
  it("builds the depreciation workbook with Schedule / Standard rates / Disposals", async () => {
    const wb = await buildDepreciationWorkbook(SAMPLE_ASSETS);
    expect(await names(wb)).toEqual(["Schedule", "Standard rates", "Disposals"]);
    const base64 = await workbookToBase64(wb);
    expect(base64.length).toBeGreaterThan(100);
  });

  it("builds the audit workbook with Cover + one sheet per procedure", async () => {
    const wb = await buildAuditWorkbook(SAMPLE_ENGAGEMENT, SAMPLE_AUDIT_STATE);
    expect(await names(wb)).toEqual(["Cover", "Expenses", "Purchases", "Sales"]);
    const base64 = await workbookToBase64(wb);
    expect(base64.length).toBeGreaterThan(100);
  });

  it("builds the 7-sheet financial model workbook", async () => {
    const wb = await buildModelWorkbook(SAMPLE_ASSUMPTIONS);
    expect(await names(wb)).toEqual([
      "Cover", "Assumptions", "Historicals", "IS Projection", "BS Projection", "CF Projection", "Dashboard",
    ]);
    const base64 = await workbookToBase64(wb);
    expect(base64.length).toBeGreaterThan(100);
  });
});
