import { toCsv } from "./csv";

// A report is a titled set of tabular sections — the shared shape the Excel builder, the CSV
// exporter, and (optionally) an on-screen preview all consume, so a report is defined once.
export type CellKind = "text" | "money" | "number" | "date" | "pct";

export interface ReportColumn {
  key: string;
  label: string;
  kind?: CellKind;
}

export interface ReportSection {
  title?: string;
  columns: ReportColumn[];
  rows: Record<string, string | number>[];
}

export interface ReportData {
  id: string;
  title: string;
  subtitle: string;
  company: string;
  sections: ReportSection[];
}

/** Flatten a report to CSV text (sections stacked with their titles). */
export function reportToCsv(report: ReportData): string {
  const parts: string[] = [report.title, report.subtitle, ""];
  for (const s of report.sections) {
    if (s.title) parts.push(s.title);
    parts.push(
      toCsv(
        s.columns.map((c) => c.label),
        s.rows.map((r) => s.columns.map((c) => r[c.key] ?? "")),
      ),
    );
    parts.push("");
  }
  return parts.join("\r\n");
}
