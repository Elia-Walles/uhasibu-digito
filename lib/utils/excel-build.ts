// Server-safe ExcelJS core. NO "use client" and NO DOM these helpers only manipulate
// ExcelJS workbook objects and serialize to a buffer, so they import cleanly on BOTH the
// server (Wave 11 export Server Actions) and the client (the off-flag browser download
// path in lib/utils/excel.ts). The browser-only sinks (Blob / document) live in excel.ts.
import ExcelJS, { type Workbook, type Worksheet, type Cell } from "exceljs";

export const STYLE = {
  /** Inputs / assumptions that the user edits. Blue font on tinted background. */
  input: {
    font: { color: { argb: "FF1D4ED8" }, bold: true } as Partial<Cell["font"]>,
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } } as Cell["fill"],
  },
  /** Formula / link cells. Green font. */
  link: {
    font: { color: { argb: "FF059669" } } as Partial<Cell["font"]>,
  },
  /** Computed / given numbers black. */
  computed: {
    font: { color: { argb: "FF111827" } } as Partial<Cell["font"]>,
  },
  /** Section header bold uppercase tracking on tinted background. */
  header: {
    font: { color: { argb: "FFFFFFFF" }, bold: true, size: 11 } as Partial<Cell["font"]>,
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F7B5E" } } as Cell["fill"],
    alignment: { vertical: "middle" } as Cell["alignment"],
  },
  /** Subheading / table column header. */
  subheader: {
    font: { color: { argb: "FF374151" }, bold: true, size: 10 } as Partial<Cell["font"]>,
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FFFE" } } as Cell["fill"],
    border: { bottom: { style: "thin", color: { argb: "FFE5F0EC" } } } as Cell["border"],
  },
  /** Total / subtotal row. */
  total: {
    font: { color: { argb: "FF0A2318" }, bold: true } as Partial<Cell["font"]>,
    border: {
      top:    { style: "thin",   color: { argb: "FF0A2318" } },
      bottom: { style: "double", color: { argb: "FF0A2318" } },
    } as Cell["border"],
  },
} as const;

/** Apply a STYLE preset to a cell. */
export function applyStyle(cell: Cell, style: { font?: Partial<Cell["font"]>; fill?: Cell["fill"]; border?: Cell["border"]; alignment?: Cell["alignment"] }) {
  if (style.font)      cell.font      = { ...(cell.font ?? {}), ...style.font };
  if (style.fill)      cell.fill      = style.fill;
  if (style.border)    cell.border    = style.border;
  if (style.alignment) cell.alignment = style.alignment;
}

/** Number format for TZS currency cells. */
export const NUM_FMT_TZS    = '_-"TSh "* #,##0_-;[Red]_-"TSh "* -#,##0_-;_-"TSh "* "-"_-;_-@_-';
export const NUM_FMT_PLAIN  = "#,##0";
export const NUM_FMT_PCT    = "0.00%";
export const NUM_FMT_RATE   = "#,##0.00";

/**
 * Create a workbook with deterministic metadata and run a builder against it. Returns the
 * built workbook the caller decides the sink (browser download or server base64). Pure;
 * no DOM, safe on the server.
 */
export async function buildWorkbook(build: (wb: Workbook) => void | Promise<void>): Promise<Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Uhasibu Digito";
  wb.company = "Uhasibu Digito";
  wb.created = new Date(0); // deterministic for tests
  await build(wb);
  return wb;
}

/** Serialize a workbook to a base64 string (server side uses node Buffer). */
export async function workbookToBase64(wb: Workbook): Promise<string> {
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer).toString("base64");
}

/** Initialise common sheet defaults: freeze header row, set first column width. */
export function setupSheet(ws: Worksheet, opts?: { freezeRow?: number; firstColWidth?: number }): Worksheet {
  ws.views = [{ state: "frozen", ySplit: opts?.freezeRow ?? 1 }];
  ws.getColumn(1).width = opts?.firstColWidth ?? 32;
  return ws;
}

export type { Workbook, Worksheet, Cell };
