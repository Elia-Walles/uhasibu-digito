"use client";
// Browser-only xlsx sinks. The pure workbook helpers (STYLE, applyStyle, setupSheet,
// number formats, buildWorkbook) live in excel-build.ts so they can run on the server too;
// they are re-exported here for backwards-compatible imports. Anything that touches the DOM
// (Blob, URL, document) stays in this client module.
import type { Workbook } from "exceljs";

export {
  STYLE,
  applyStyle,
  setupSheet,
  buildWorkbook,
  workbookToBase64,
  NUM_FMT_TZS,
  NUM_FMT_PLAIN,
  NUM_FMT_PCT,
  NUM_FMT_RATE,
  type Workbook,
  type Worksheet,
  type Cell,
} from "@/lib/utils/excel-build";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function saveBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Serialize a prebuilt workbook to a blob and trigger a browser download. */
export async function downloadWorkbook(filename: string, wb: Workbook): Promise<void> {
  const buffer = await wb.xlsx.writeBuffer();
  saveBlob(filename, new Blob([buffer], { type: XLSX_MIME }));
}

/** Decode a server-generated base64 xlsx and trigger a browser download. */
export function saveBase64Xlsx(filename: string, base64: string): void {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  saveBlob(filename, new Blob([bytes], { type: XLSX_MIME }));
}
