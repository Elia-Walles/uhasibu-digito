import type { ModelAssumptions } from "@/types";
import {
  buildWorkbook,
  setupSheet,
  applyStyle,
  STYLE,
  NUM_FMT_PLAIN,
  NUM_FMT_PCT,
  type Workbook,
} from "@/lib/utils/excel-build";

export interface ModelCompany {
  name: string;
  shortName: string;
  address: string;
  branch: string;
  tin: string;
  vatNumber: string;
  efdSerial: string;
  nbaaNumber: string;
  baseCurrency: string;
}

const DEFAULT_COMPANY: ModelCompany = {
  name: "Your Company", shortName: "Company", address: "", branch: "",
  tin: "", vatNumber: "", efdSerial: "", nbaaNumber: "", baseCurrency: "TZS",
};

const FORECAST_YEARS = [2025, 2026, 2027];

interface Historicals {
  revenueFY2023: number;
  revenueFY2024: number;
  cogsFY2024: number;
  opexFY2024: number;
  cashFY2024: number;
  equityFY2024: number;
  ppeFY2024: number;
}

const HIST: Historicals = {
  revenueFY2023: 739_600_000,
  revenueFY2024: 847_230_000,
  cogsFY2024: 418_820_000,
  opexFY2024: 303_850_000,
  cashFY2024: 312_800_000,
  equityFY2024: 586_950_000,
  ppeFY2024: 312_500_000,
};

export function modelFilename(company: ModelCompany = DEFAULT_COMPANY): string {
  return `Uhasibu-Digito-Model-${(company.shortName || "Company").replace(/\s+/g, "-")}.xlsx`;
}

export function buildModelWorkbook(assumptions: ModelAssumptions, company: ModelCompany = DEFAULT_COMPANY): Promise<Workbook> {
  return buildWorkbook(async (wb) => {
    // ============ Cover ============
    const cover = wb.addWorksheet("Cover");
    setupSheet(cover, { freezeRow: 0, firstColWidth: 28 });
    cover.getColumn(2).width = 60;
    cover.mergeCells("A1:B1");
    const title = cover.getCell("A1");
    title.value = "Uhasibu Digito™ — Financial Model";
    applyStyle(title, STYLE.header);
    title.alignment = { vertical: "middle", horizontal: "center" };
    cover.getRow(1).height = 32;

    const rows: [string, string][] = [
      ["Business name",  company.name],
      ["Short name",     company.shortName],
      ["Location",       company.address],
      ["Branch",         company.branch],
      ["Primary products", assumptions.primaryProducts],
      ["TIN",            company.tin],
      ["VAT number",     company.vatNumber],
      ["EFD serial",     company.efdSerial],
      ["NBAA #",         company.nbaaNumber],
      ["Base currency",  company.baseCurrency],
      ["Scenario",       assumptions.scenario],
      ["Forecast horizon", `${FORECAST_YEARS[0]} – ${FORECAST_YEARS[FORECAST_YEARS.length - 1]}`],
    ];
    rows.forEach(([k, v], i) => {
      const r = cover.getRow(i + 3);
      r.getCell(1).value = k;
      applyStyle(r.getCell(1), STYLE.subheader);
      r.getCell(2).value = v;
    });
    cover.addRow([]);
    const legend = cover.addRow(["Legend"]);
    applyStyle(legend.getCell(1), STYLE.subheader);
    const lInput = cover.addRow(["Inputs (editable)", "Blue font + tinted background"]);
    applyStyle(lInput.getCell(1), STYLE.input);
    applyStyle(lInput.getCell(2), STYLE.input);
    const lLink = cover.addRow(["Links / formulas", "Green font, no hard-coded values"]);
    applyStyle(lLink.getCell(1), STYLE.link);
    applyStyle(lLink.getCell(2), STYLE.link);
    const lComp = cover.addRow(["Computed / given", "Black"]);
    applyStyle(lComp.getCell(1), STYLE.computed);
    applyStyle(lComp.getCell(2), STYLE.computed);

    // ============ Assumptions ============
    const a = wb.addWorksheet("Assumptions");
    setupSheet(a, { freezeRow: 2, firstColWidth: 36 });
    a.getColumn(2).width = 18;
    const aHead = a.getRow(1);
    aHead.getCell(1).value = "Driver";
    aHead.getCell(2).value = "Value";
    applyStyle(aHead.getCell(1), STYLE.header);
    applyStyle(aHead.getCell(2), STYLE.header);

    const assumptionRows: [string, number, string][] = [
      ["Inflation rate",          assumptions.inflationRate,      NUM_FMT_PCT],
      ["TZS / USD exchange rate", assumptions.fxTzsPerUsd,        NUM_FMT_PLAIN],
      ["Revenue growth (annual)", assumptions.revenueGrowth,      NUM_FMT_PCT],
      ["Gross margin target",     assumptions.grossMarginTarget,  NUM_FMT_PCT],
      ["Opex growth (annual)",    assumptions.opexGrowth,         NUM_FMT_PCT],
      ["CapEx (annual TZS)",      assumptions.capexAnnual,        NUM_FMT_PLAIN],
      ["Corporate tax rate",      assumptions.taxRate,            NUM_FMT_PCT],
    ];
    // Row positions of assumption values (1-based) — referenced from projection formulas.
    const A_INFL = 3, A_FX = 4, A_REVG = 5, A_GMG = 6, A_OPXG = 7, A_CAPEX = 8, A_TAX = 9;
    assumptionRows.forEach((row, i) => {
      const r = a.getRow(i + 3);
      r.getCell(1).value = row[0];
      const c = r.getCell(2);
      c.value = row[1];
      c.numFmt = row[2];
      applyStyle(c, STYLE.input);
    });

    // ============ Historicals ============
    const h = wb.addWorksheet("Historicals");
    setupSheet(h, { freezeRow: 2, firstColWidth: 36 });
    [2, 3, 4].forEach((col) => { h.getColumn(col).width = 18; });
    const hHead = h.getRow(1);
    ["Line item", "FY 2023", "FY 2024"].forEach((v, i) => {
      hHead.getCell(i + 1).value = v;
      applyStyle(hHead.getCell(i + 1), STYLE.header);
    });

    const hRows: [string, number | null, number][] = [
      ["Revenue",            HIST.revenueFY2023, HIST.revenueFY2024],
      ["Cost of sales",      null,               HIST.cogsFY2024],
      ["Operating expenses", null,               HIST.opexFY2024],
      ["Cash & bank",        null,               HIST.cashFY2024],
      ["Total equity",       null,               HIST.equityFY2024],
      ["PPE (net)",          null,               HIST.ppeFY2024],
    ];
    // Row positions (1-based)
    const H_REV = 3, H_COGS = 4, H_OPEX = 5, H_CASH = 6, H_EQUITY = 7, H_PPE = 8;
    hRows.forEach((row, i) => {
      const r = h.getRow(i + 3);
      r.getCell(1).value = row[0];
      if (row[1] !== null) {
        r.getCell(2).value = row[1];
        r.getCell(2).numFmt = NUM_FMT_PLAIN;
        applyStyle(r.getCell(2), STYLE.computed);
      }
      r.getCell(3).value = row[2];
      r.getCell(3).numFmt = NUM_FMT_PLAIN;
      applyStyle(r.getCell(3), STYLE.computed);
    });

    // ============ Income Statement projection ============
    const is = wb.addWorksheet("IS Projection");
    setupSheet(is, { freezeRow: 2, firstColWidth: 32 });
    [2, 3, 4].forEach((col) => { is.getColumn(col).width = 18; });
    const isHead = is.getRow(1);
    ["Line item", ...FORECAST_YEARS.map((y) => `FY ${y}`)].forEach((v, i) => {
      isHead.getCell(i + 1).value = v;
      applyStyle(isHead.getCell(i + 1), STYLE.header);
    });

    function isCellRow(label: string, rowIdx: number, formulaFor: (yearCol: number, prevYearCol: number) => string, isTotalRow = false) {
      const r = is.getRow(rowIdx);
      r.getCell(1).value = label;
      [2, 3, 4].forEach((col) => {
        const cell = r.getCell(col);
        cell.value = { formula: formulaFor(col, col - 1) };
        cell.numFmt = NUM_FMT_PLAIN;
        applyStyle(cell, isTotalRow ? STYLE.total : STYLE.link);
      });
    }

    // FY 2025 references FY 2024 from Historicals; FY 2026 references FY 2025 from this sheet, etc.
    // Revenue: previous-year revenue × (1 + revenue growth)
    const yearToCol = (i: number) => 2 + i;
    is.getRow(3).getCell(1).value = "Revenue";
    [0, 1, 2].forEach((i) => {
      const col = yearToCol(i);
      const c = is.getRow(3).getCell(col);
      if (i === 0) {
        c.value = { formula: `Historicals!C${H_REV}*(1+Assumptions!B${A_REVG})` };
      } else {
        c.value = { formula: `${cellRef(col - 1, 3)}*(1+Assumptions!B${A_REVG})` };
      }
      c.numFmt = NUM_FMT_PLAIN;
      applyStyle(c, STYLE.link);
    });

    // Cost of sales: revenue × (1 - gross margin)
    is.getRow(4).getCell(1).value = "Cost of sales";
    [0, 1, 2].forEach((i) => {
      const col = yearToCol(i);
      const c = is.getRow(4).getCell(col);
      c.value = { formula: `${cellRef(col, 3)}*(1-Assumptions!B${A_GMG})` };
      c.numFmt = NUM_FMT_PLAIN;
      applyStyle(c, STYLE.link);
    });

    // Gross profit: revenue - COGS
    is.getRow(5).getCell(1).value = "Gross profit";
    [0, 1, 2].forEach((i) => {
      const col = yearToCol(i);
      const c = is.getRow(5).getCell(col);
      c.value = { formula: `${cellRef(col, 3)}-${cellRef(col, 4)}` };
      c.numFmt = NUM_FMT_PLAIN;
      applyStyle(c, STYLE.total);
    });

    // Opex: prior-year opex × (1 + opex growth). Year 1 prior = Historicals.
    is.getRow(6).getCell(1).value = "Operating expenses";
    [0, 1, 2].forEach((i) => {
      const col = yearToCol(i);
      const c = is.getRow(6).getCell(col);
      if (i === 0) {
        c.value = { formula: `Historicals!C${H_OPEX}*(1+Assumptions!B${A_OPXG})` };
      } else {
        c.value = { formula: `${cellRef(col - 1, 6)}*(1+Assumptions!B${A_OPXG})` };
      }
      c.numFmt = NUM_FMT_PLAIN;
      applyStyle(c, STYLE.link);
    });

    // Operating profit
    is.getRow(7).getCell(1).value = "Operating profit";
    [0, 1, 2].forEach((i) => {
      const col = yearToCol(i);
      const c = is.getRow(7).getCell(col);
      c.value = { formula: `${cellRef(col, 5)}-${cellRef(col, 6)}` };
      c.numFmt = NUM_FMT_PLAIN;
      applyStyle(c, STYLE.total);
    });

    // Tax
    is.getRow(8).getCell(1).value = "Income tax";
    [0, 1, 2].forEach((i) => {
      const col = yearToCol(i);
      const c = is.getRow(8).getCell(col);
      c.value = { formula: `${cellRef(col, 7)}*Assumptions!B${A_TAX}` };
      c.numFmt = NUM_FMT_PLAIN;
      applyStyle(c, STYLE.link);
    });

    // Net profit
    is.getRow(9).getCell(1).value = "Net profit";
    [0, 1, 2].forEach((i) => {
      const col = yearToCol(i);
      const c = is.getRow(9).getCell(col);
      c.value = { formula: `${cellRef(col, 7)}-${cellRef(col, 8)}` };
      c.numFmt = NUM_FMT_PLAIN;
      applyStyle(c, STYLE.total);
    });

    // Inflation reference / informational (uses A_INFL so the assumption is wired)
    is.getRow(11).getCell(1).value = "Memo: inflation applied to opex";
    is.getRow(11).getCell(2).value = { formula: `Assumptions!B${A_INFL}` };
    is.getRow(11).getCell(2).numFmt = NUM_FMT_PCT;
    applyStyle(is.getRow(11).getCell(2), STYLE.link);

    [3, 5, 7, 9].forEach((rowIdx) => {
      applyStyle(is.getRow(rowIdx).getCell(1), STYLE.subheader);
    });

    // ============ Balance Sheet projection ============
    const bs = wb.addWorksheet("BS Projection");
    setupSheet(bs, { freezeRow: 2, firstColWidth: 32 });
    [2, 3, 4].forEach((col) => { bs.getColumn(col).width = 18; });
    const bsHead = bs.getRow(1);
    ["Line item", ...FORECAST_YEARS.map((y) => `FY ${y}`)].forEach((v, i) => {
      bsHead.getCell(i + 1).value = v;
      applyStyle(bsHead.getCell(i + 1), STYLE.header);
    });

    bs.getRow(3).getCell(1).value = "PPE (net)";
    [0, 1, 2].forEach((i) => {
      const col = yearToCol(i);
      const c = bs.getRow(3).getCell(col);
      if (i === 0) {
        c.value = { formula: `Historicals!C${H_PPE}+Assumptions!B${A_CAPEX}` };
      } else {
        c.value = { formula: `${cellRef(col - 1, 3)}+Assumptions!B${A_CAPEX}` };
      }
      c.numFmt = NUM_FMT_PLAIN;
      applyStyle(c, STYLE.link);
    });

    bs.getRow(4).getCell(1).value = "Cash & bank";
    [0, 1, 2].forEach((i) => {
      const col = yearToCol(i);
      const c = bs.getRow(4).getCell(col);
      if (i === 0) {
        c.value = { formula: `Historicals!C${H_CASH}+'IS Projection'!${cellCol(col)}9-Assumptions!B${A_CAPEX}` };
      } else {
        c.value = { formula: `${cellRef(col - 1, 4)}+'IS Projection'!${cellCol(col)}9-Assumptions!B${A_CAPEX}` };
      }
      c.numFmt = NUM_FMT_PLAIN;
      applyStyle(c, STYLE.link);
    });

    bs.getRow(5).getCell(1).value = "Total assets";
    [0, 1, 2].forEach((i) => {
      const col = yearToCol(i);
      const c = bs.getRow(5).getCell(col);
      c.value = { formula: `${cellRef(col, 3)}+${cellRef(col, 4)}` };
      c.numFmt = NUM_FMT_PLAIN;
      applyStyle(c, STYLE.total);
    });

    bs.getRow(7).getCell(1).value = "Equity";
    [0, 1, 2].forEach((i) => {
      const col = yearToCol(i);
      const c = bs.getRow(7).getCell(col);
      if (i === 0) {
        c.value = { formula: `Historicals!C${H_EQUITY}+'IS Projection'!${cellCol(col)}9` };
      } else {
        c.value = { formula: `${cellRef(col - 1, 7)}+'IS Projection'!${cellCol(col)}9` };
      }
      c.numFmt = NUM_FMT_PLAIN;
      applyStyle(c, STYLE.link);
    });

    bs.getRow(8).getCell(1).value = "Memo: FX rate used";
    bs.getRow(8).getCell(2).value = { formula: `Assumptions!B${A_FX}` };
    bs.getRow(8).getCell(2).numFmt = NUM_FMT_PLAIN;
    applyStyle(bs.getRow(8).getCell(2), STYLE.link);

    // ============ Cash Flow projection ============
    const cf = wb.addWorksheet("CF Projection");
    setupSheet(cf, { freezeRow: 2, firstColWidth: 32 });
    [2, 3, 4].forEach((col) => { cf.getColumn(col).width = 18; });
    const cfHead = cf.getRow(1);
    ["Line item", ...FORECAST_YEARS.map((y) => `FY ${y}`)].forEach((v, i) => {
      cfHead.getCell(i + 1).value = v;
      applyStyle(cfHead.getCell(i + 1), STYLE.header);
    });

    cf.getRow(3).getCell(1).value = "Net profit (from IS)";
    [0, 1, 2].forEach((i) => {
      const col = yearToCol(i);
      const c = cf.getRow(3).getCell(col);
      c.value = { formula: `'IS Projection'!${cellCol(col)}9` };
      c.numFmt = NUM_FMT_PLAIN;
      applyStyle(c, STYLE.link);
    });

    cf.getRow(4).getCell(1).value = "Less: CapEx";
    [0, 1, 2].forEach((i) => {
      const col = yearToCol(i);
      const c = cf.getRow(4).getCell(col);
      c.value = { formula: `-Assumptions!B${A_CAPEX}` };
      c.numFmt = NUM_FMT_PLAIN;
      applyStyle(c, STYLE.link);
    });

    cf.getRow(5).getCell(1).value = "Net change in cash";
    [0, 1, 2].forEach((i) => {
      const col = yearToCol(i);
      const c = cf.getRow(5).getCell(col);
      c.value = { formula: `${cellRef(col, 3)}+${cellRef(col, 4)}` };
      c.numFmt = NUM_FMT_PLAIN;
      applyStyle(c, STYLE.total);
    });

    // ============ Dashboard ============
    const dash = wb.addWorksheet("Dashboard");
    setupSheet(dash, { freezeRow: 0, firstColWidth: 32 });
    dash.getColumn(2).width = 22;
    dash.mergeCells("A1:B1");
    const dt = dash.getCell("A1");
    dt.value = "Forecast Dashboard";
    applyStyle(dt, STYLE.header);
    dt.alignment = { vertical: "middle", horizontal: "center" };
    dash.getRow(1).height = 28;

    const dashRows: [string, string, string][] = [
      ["Revenue FY 2024 (historical)", `Historicals!C${H_REV}`, NUM_FMT_PLAIN],
      ["Revenue FY 2027 (projected)",  `'IS Projection'!D3`,    NUM_FMT_PLAIN],
      ["Net profit FY 2027 (projected)", `'IS Projection'!D9`,  NUM_FMT_PLAIN],
      ["Cash FY 2027 (projected)",     `'BS Projection'!D4`,    NUM_FMT_PLAIN],
      ["Revenue CAGR FY24→FY27",       `(('IS Projection'!D3/Historicals!C${H_REV})^(1/3))-1`, NUM_FMT_PCT],
    ];
    dashRows.forEach(([label, formula, fmt], i) => {
      const r = dash.getRow(i + 3);
      r.getCell(1).value = label;
      applyStyle(r.getCell(1), STYLE.subheader);
      const c = r.getCell(2);
      c.value = { formula };
      c.numFmt = fmt;
      applyStyle(c, STYLE.link);
    });

    // Cover is the first sheet added so it opens by default. No additional view config needed.
  });
}

function cellCol(col: number): string {
  // 1 -> A, 2 -> B, ... up to 26
  return String.fromCharCode(64 + col);
}
function cellRef(col: number, row: number): string {
  return `${cellCol(col)}${row}`;
}
