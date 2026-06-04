import type { FixedAsset, AssetCategory } from "@/types";
import { STANDARD_RATES } from "@/lib/utils/depreciation-rates";
import {
  buildWorkbook,
  setupSheet,
  applyStyle,
  STYLE,
  NUM_FMT_PLAIN,
  NUM_FMT_PCT,
  type Workbook,
} from "@/lib/utils/excel-build";

export const DEPRECIATION_FILENAME = "Uhasibu-Digito-Depreciation-Schedule.xlsx";

export function buildDepreciationWorkbook(assets: FixedAsset[]): Promise<Workbook> {
  return buildWorkbook((wb) => {
    // ============ Schedule ============
    const ws = wb.addWorksheet("Schedule");
    setupSheet(ws, { freezeRow: 2, firstColWidth: 36 });
    [2, 3, 4, 5, 6, 7, 8].forEach((c) => { ws.getColumn(c).width = 16; });
    const head = ws.getRow(1);
    ["Asset", "Code", "Category", "Cost", "Residual", "Life (yrs)", "Annual dep.", "Accum. dep.", "NBV"].forEach((label, i) => {
      head.getCell(i + 1).value = label;
      applyStyle(head.getCell(i + 1), STYLE.header);
    });

    const active = assets.filter((a) => a.status === "Active" || a.status === "Fully Depreciated");
    active.forEach((a, i) => {
      const r = ws.getRow(i + 3);
      r.getCell(1).value = a.name;
      applyStyle(r.getCell(1), STYLE.computed);
      r.getCell(2).value = a.code;
      r.getCell(3).value = a.category;

      // Inputs (blue) — cost, residual, life
      r.getCell(4).value = a.cost;
      r.getCell(4).numFmt = NUM_FMT_PLAIN;
      applyStyle(r.getCell(4), STYLE.input);

      r.getCell(5).value = a.residualValue;
      r.getCell(5).numFmt = NUM_FMT_PLAIN;
      applyStyle(r.getCell(5), STYLE.input);

      r.getCell(6).value = a.usefulLifeYears;
      applyStyle(r.getCell(6), STYLE.input);

      // Computed (green formulas) — annual dep, accum dep, NBV
      r.getCell(7).value = { formula: `(D${i + 3}-E${i + 3})/F${i + 3}` };
      r.getCell(7).numFmt = NUM_FMT_PLAIN;
      applyStyle(r.getCell(7), STYLE.link);

      r.getCell(8).value = a.accumulatedDepreciation;
      r.getCell(8).numFmt = NUM_FMT_PLAIN;
      applyStyle(r.getCell(8), STYLE.computed);

      r.getCell(9).value = { formula: `D${i + 3}-H${i + 3}` };
      r.getCell(9).numFmt = NUM_FMT_PLAIN;
      applyStyle(r.getCell(9), STYLE.link);
    });

    // Totals
    const totalRow = ws.getRow(active.length + 4);
    totalRow.getCell(1).value = "Total";
    applyStyle(totalRow.getCell(1), STYLE.total);
    [4, 7, 8, 9].forEach((col) => {
      const colLetter = String.fromCharCode(64 + col);
      const cell = totalRow.getCell(col);
      cell.value = { formula: `SUM(${colLetter}3:${colLetter}${active.length + 2})` };
      cell.numFmt = NUM_FMT_PLAIN;
      applyStyle(cell, STYLE.total);
    });

    // ============ Standard rates ============
    const rates = wb.addWorksheet("Standard rates");
    setupSheet(rates, { freezeRow: 2, firstColWidth: 22 });
    [2, 3, 4].forEach((c) => { rates.getColumn(c).width = 18; });
    rates.getColumn(5).width = 42;
    const rHead = rates.getRow(1);
    ["Asset class", "Straight-line", "Reducing balance", "Useful life (yrs)", "Basis"].forEach((label, i) => {
      rHead.getCell(i + 1).value = label;
      applyStyle(rHead.getCell(i + 1), STYLE.header);
    });
    const classes: AssetCategory[] = ["Building", "Vehicle", "Equipment", "Computer", "Furniture"];
    classes.forEach((cls, i) => {
      const rate = STANDARD_RATES[cls];
      const r = rates.getRow(i + 3);
      r.getCell(1).value = cls;
      applyStyle(r.getCell(1), STYLE.subheader);
      r.getCell(2).value = rate.slPct;
      r.getCell(2).numFmt = NUM_FMT_PCT;
      r.getCell(3).value = rate.rbPct;
      r.getCell(3).numFmt = NUM_FMT_PCT;
      r.getCell(4).value = rate.usefulLife;
      r.getCell(5).value = rate.basis;
    });
    const note = rates.getRow(classes.length + 5);
    note.getCell(1).value = "Note: Rates are TRA/NBAA-aligned defaults. Verify with your tax advisor for each engagement.";
    applyStyle(note.getCell(1), { font: { color: { argb: "FFD97706" }, bold: true } });

    // ============ Disposals ============
    const disposed = assets.filter((a) => a.status === "Disposed");
    const disp = wb.addWorksheet("Disposals");
    setupSheet(disp, { freezeRow: 2, firstColWidth: 36 });
    [2, 3, 4, 5, 6].forEach((c) => { disp.getColumn(c).width = 18; });
    const dHead = disp.getRow(1);
    ["Asset", "Code", "Disposal date", "Cost", "Proceeds", "Gain / (Loss)"].forEach((label, i) => {
      dHead.getCell(i + 1).value = label;
      applyStyle(dHead.getCell(i + 1), STYLE.header);
    });
    if (disposed.length === 0) {
      disp.getRow(3).getCell(1).value = "No disposals recorded";
    }
    disposed.forEach((a, i) => {
      const r = disp.getRow(i + 3);
      r.getCell(1).value = a.name;
      r.getCell(2).value = a.code;
      r.getCell(3).value = a.disposalDate ?? "";
      r.getCell(4).value = a.cost;
      r.getCell(4).numFmt = NUM_FMT_PLAIN;
      r.getCell(5).value = a.disposalProceeds ?? 0;
      r.getCell(5).numFmt = NUM_FMT_PLAIN;
      r.getCell(6).value = a.gainLoss ?? 0;
      r.getCell(6).numFmt = NUM_FMT_PLAIN;
      if ((a.gainLoss ?? 0) >= 0) {
        applyStyle(r.getCell(6), { font: { color: { argb: "FF059669" }, bold: true } });
      } else {
        applyStyle(r.getCell(6), { font: { color: { argb: "FFDC2626" }, bold: true } });
      }
    });
  });
}
