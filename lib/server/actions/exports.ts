"use server";
import { withAuth } from "@/lib/server/with-auth";
import { listAssets } from "@/lib/server/actions/fixed-assets";
import { getAudit } from "@/lib/server/actions/audit";
import { modelAssumptionsSchema } from "@/lib/server/schemas/exports";
import { workbookToBase64 } from "@/lib/utils/excel-build";
import { buildDepreciationWorkbook, DEPRECIATION_FILENAME } from "@/lib/utils/depreciation-export";
import { buildAuditWorkbook, auditFilename } from "@/lib/utils/audit-export";
import { buildModelWorkbook, modelFilename } from "@/lib/utils/model-export";

// Wave 11 — xlsx generation moved server-side. Each action authenticates (directly or via a
// reused tenant-scoped read action), builds the workbook with the shared pure builders, and
// returns the bytes as base64 for the client to save. The demo (flag off) keeps building in
// the browser; see lib/hooks/useExports.ts.
export interface ExportFile {
  filename: string;
  base64: string;
}

export async function exportDepreciationXlsx(): Promise<ExportFile> {
  // listAssets is itself withAuth + tenant-scoped — reuse it for the live data.
  const assets = await listAssets();
  const wb = await buildDepreciationWorkbook(assets);
  return { filename: DEPRECIATION_FILENAME, base64: await workbookToBase64(wb) };
}

export async function exportAuditXlsx(): Promise<ExportFile> {
  // getAudit is withAuth + tenant-scoped (engagement + step results).
  const { engagement, results } = await getAudit();
  const wb = await buildAuditWorkbook(engagement, results);
  return { filename: auditFilename(engagement), base64: await workbookToBase64(wb) };
}

export async function exportModelXlsx(input: unknown): Promise<ExportFile> {
  const parsed = modelAssumptionsSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid assumptions");
  return withAuth(async () => {
    const wb = await buildModelWorkbook(parsed.data);
    return { filename: modelFilename(), base64: await workbookToBase64(wb) };
  });
}
