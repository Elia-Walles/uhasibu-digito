"use client";
import { REPORTS_BACKEND_ENABLED } from "@/lib/flags";
import { downloadWorkbook, saveBase64Xlsx } from "@/lib/utils/excel";
import { buildDepreciationWorkbook, DEPRECIATION_FILENAME } from "@/lib/utils/depreciation-export";
import { buildAuditWorkbook, auditFilename } from "@/lib/utils/audit-export";
import { buildModelWorkbook, modelFilename } from "@/lib/utils/model-export";
import {
  exportDepreciationXlsx,
  exportAuditXlsx,
  exportModelXlsx,
} from "@/lib/server/actions/exports";
import type { FixedAsset, AuditEngagement, AuditProcedure, AuditProcedureState, ModelAssumptions } from "@/types";

export interface UseExports {
  exportDepreciation: (assets: FixedAsset[]) => Promise<void>;
  exportAudit: (engagement: AuditEngagement, state: Record<AuditProcedure, AuditProcedureState>) => Promise<void>;
  exportModel: (assumptions: ModelAssumptions) => Promise<void>;
}

/**
 * Flag-gated xlsx export facade. With `reports` off, the workbook is built and downloaded in
 * the browser (the demo path, unchanged). With it on, generation happens server-side from the
 * tenant's live data and the client just saves the returned bytes — see lib/server/actions/exports.ts.
 */
export function useExports(): UseExports {
  if (!REPORTS_BACKEND_ENABLED) {
    return {
      exportDepreciation: async (assets) => {
        await downloadWorkbook(DEPRECIATION_FILENAME, await buildDepreciationWorkbook(assets));
      },
      exportAudit: async (engagement, state) => {
        await downloadWorkbook(auditFilename(engagement), await buildAuditWorkbook(engagement, state));
      },
      exportModel: async (assumptions) => {
        await downloadWorkbook(modelFilename(), await buildModelWorkbook(assumptions));
      },
    };
  }

  return {
    // Depreciation + audit read live data on the server; the passed args are ignored on this path.
    exportDepreciation: async () => {
      const { filename, base64 } = await exportDepreciationXlsx();
      saveBase64Xlsx(filename, base64);
    },
    exportAudit: async () => {
      const { filename, base64 } = await exportAuditXlsx();
      saveBase64Xlsx(filename, base64);
    },
    exportModel: async (assumptions) => {
      const { filename, base64 } = await exportModelXlsx(assumptions);
      saveBase64Xlsx(filename, base64);
    },
  };
}
