"use client";
import { getReportData, exportReportXlsx } from "@/lib/server/actions/reports";
import { reportToCsv } from "@/lib/utils/report-data";
import { saveCsv } from "@/lib/utils/csv";
import { saveBase64Xlsx } from "@/lib/utils/excel";

export type ReportFormat = "xlsx" | "csv";

export function useReports() {
  return {
    /** Generate a report and download it in the requested format. Throws on an unavailable report. */
    download: async (reportId: string, format: ReportFormat): Promise<void> => {
      if (format === "xlsx") {
        const file = await exportReportXlsx(reportId);
        saveBase64Xlsx(file.filename, file.base64);
      } else {
        const data = await getReportData(reportId);
        saveCsv(`${data.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`, reportToCsv(data));
      }
    },
  };
}
