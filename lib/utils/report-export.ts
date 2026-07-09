// Server-safe: turns a ReportData into a styled ExcelJS workbook (one sheet per section),
// reusing the shared excel-build core. No DOM.
import {
  buildWorkbook, setupSheet, applyStyle, STYLE,
  NUM_FMT_TZS, NUM_FMT_PLAIN, NUM_FMT_PCT, type Workbook,
} from "./excel-build";
import type { ReportData, CellKind } from "./report-data";

function numFmt(kind?: CellKind): string | undefined {
  if (kind === "money") return NUM_FMT_TZS;
  if (kind === "number") return NUM_FMT_PLAIN;
  if (kind === "pct") return NUM_FMT_PCT;
  return undefined;
}

function safeSheetName(raw: string, fallback: string): string {
  const cleaned = raw.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 28);
  return cleaned || fallback;
}

export async function buildReportWorkbook(report: ReportData): Promise<Workbook> {
  return buildWorkbook((wb) => {
    const sections = report.sections.length > 0 ? report.sections : [{ columns: [{ key: "note", label: "Note" }], rows: [{ note: "No data for this period." }] }];
    sections.forEach((section, idx) => {
      const cols = Math.max(1, section.columns.length);
      const ws = wb.addWorksheet(safeSheetName(section.title ?? report.title, `Sheet ${idx + 1}`));

      ws.mergeCells(1, 1, 1, cols);
      ws.getCell(1, 1).value = report.title;
      applyStyle(ws.getCell(1, 1), STYLE.header);
      ws.mergeCells(2, 1, 2, cols);
      ws.getCell(2, 1).value = `${report.company} · ${report.subtitle}`;
      applyStyle(ws.getCell(2, 1), STYLE.computed);

      const headerRow = 4;
      section.columns.forEach((col, ci) => {
        const cell = ws.getCell(headerRow, ci + 1);
        cell.value = col.label;
        applyStyle(cell, STYLE.subheader);
        if (ci > 0) cell.alignment = { horizontal: "right" };
      });

      section.rows.forEach((r, ri) => {
        section.columns.forEach((col, ci) => {
          const cell = ws.getCell(headerRow + 1 + ri, ci + 1);
          const v = r[col.key];
          cell.value = v ?? "";
          const fmt = numFmt(col.kind);
          if (fmt && typeof v === "number") cell.numFmt = fmt;
        });
      });

      setupSheet(ws, { freezeRow: headerRow, firstColWidth: 34 });
      section.columns.forEach((_, ci) => { if (ci > 0) ws.getColumn(ci + 1).width = 18; });
    });
  });
}
