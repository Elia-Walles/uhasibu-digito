"use client";
import { saveBase64Xlsx } from "@/lib/utils/excel";
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
 * xlsx export facade. Generation happens server-side from the tenant's live data; the client
 * just saves the returned bytes — see lib/server/actions/exports.ts. Depreciation + audit read
 * live data on the server, so the passed args are ignored on those paths.
 */
export function useExports(): UseExports {
  return {
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
