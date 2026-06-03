"use client";
import type { AuditEngagement, AuditProcedure, AuditProcedureState } from "@/types";
import { AUDIT_STEPS } from "@/lib/mock-data/audit-steps";
import {
  downloadWorkbook,
  setupSheet,
  applyStyle,
  STYLE,
} from "@/lib/utils/excel";

export async function exportAuditReport(
  engagement: AuditEngagement,
  state: Record<AuditProcedure, AuditProcedureState>,
): Promise<void> {
  const safeName = engagement.name.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 60);
  const filename = `${safeName || "Audit-Report"}.xlsx`;

  await downloadWorkbook(filename, (wb) => {
    // Cover sheet
    const cover = wb.addWorksheet("Cover");
    setupSheet(cover, { freezeRow: 0, firstColWidth: 28 });
    cover.getColumn(2).width = 60;
    cover.mergeCells("A1:B1");
    const t = cover.getCell("A1");
    t.value = "Audit Report — Uhasibu Digito™";
    applyStyle(t, STYLE.header);
    t.alignment = { vertical: "middle", horizontal: "center" };
    cover.getRow(1).height = 30;

    const rows: [string, string][] = [
      ["Engagement", engagement.name],
      ["Period",     engagement.period],
      ["Auditor",    engagement.auditorName],
      ["Generated",  "Uhasibu Digito"],
    ];
    rows.forEach(([k, v], i) => {
      const r = cover.getRow(i + 3);
      r.getCell(1).value = k;
      applyStyle(r.getCell(1), STYLE.subheader);
      r.getCell(2).value = v;
    });

    // One sheet per procedure
    (["Expenses", "Purchases", "Sales"] as AuditProcedure[]).forEach((procedure) => {
      const ws = wb.addWorksheet(procedure);
      setupSheet(ws, { freezeRow: 2, firstColWidth: 32 });
      ws.getColumn(2).width = 50;
      ws.getColumn(3).width = 14;
      ws.getColumn(4).width = 60;
      const head = ws.getRow(1);
      ["Step", "Description", "Status", "Notes"].forEach((label, i) => {
        head.getCell(i + 1).value = label;
        applyStyle(head.getCell(i + 1), STYLE.header);
      });

      const steps = AUDIT_STEPS[procedure];
      const results = state[procedure].results;
      steps.forEach((step, i) => {
        const r = ws.getRow(i + 3);
        r.getCell(1).value = step.title;
        applyStyle(r.getCell(1), STYLE.subheader);
        r.getCell(2).value = step.description;
        const status = results[step.key]?.status ?? "Pending";
        r.getCell(3).value = status;
        if (status === "Passed") {
          applyStyle(r.getCell(3), { font: { color: { argb: "FF059669" }, bold: true } });
        } else if (status === "Exception") {
          applyStyle(r.getCell(3), { font: { color: { argb: "FFDC2626" }, bold: true } });
        }
        r.getCell(4).value = results[step.key]?.notes ?? "";
        r.alignment = { vertical: "top", wrapText: true };
      });

      // Summary footer
      const summaryRow = ws.getRow(steps.length + 5);
      summaryRow.getCell(1).value = "Summary";
      applyStyle(summaryRow.getCell(1), STYLE.total);
      const passed = steps.filter((s) => results[s.key]?.status === "Passed").length;
      const exceptions = steps.filter((s) => results[s.key]?.status === "Exception").length;
      summaryRow.getCell(2).value = `${passed} passed · ${exceptions} exception(s) · ${steps.length - passed - exceptions} pending`;
      applyStyle(summaryRow.getCell(2), STYLE.total);
    });
  });
}
