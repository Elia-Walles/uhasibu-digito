"use client";
import { useCallback, useEffect, useState } from "react";
import {
  getAudit,
  setAuditStep as setStepAction,
  resetAuditProcedure as resetAction,
  updateAuditEngagement as updateEngAction,
} from "@/lib/server/actions/audit";
import type { AuditEngagement, AuditProcedure, AuditProcedureState, AuditStepStatus } from "@/types";

export interface UseAudit {
  engagement: AuditEngagement;
  results: Record<AuditProcedure, AuditProcedureState>;
  loading: boolean;
  setStep: (procedure: AuditProcedure, stepKey: string, status: AuditStepStatus, notes: string) => void;
  resetProcedure: (procedure: AuditProcedure) => void;
  updateEngagement: (patch: Partial<AuditEngagement>) => void;
}

const EMPTY_RESULTS: Record<AuditProcedure, AuditProcedureState> = {
  Expenses: { results: {} },
  Purchases: { results: {} },
  Sales: { results: {} },
};

const PLACEHOLDER_ENGAGEMENT: AuditEngagement = { name: "", period: "", auditorName: "" };

export function useAudit(): UseAudit {
  const [engagement, setEngagement] = useState<AuditEngagement>(PLACEHOLDER_ENGAGEMENT);
  const [results, setResults] = useState<Record<AuditProcedure, AuditProcedureState>>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getAudit();
      setEngagement(snap.engagement);
      setResults(snap.results);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  return {
    engagement,
    results,
    loading,
    // Optimistic local update keeps the checklist's status toggles and notes typing instant;
    // the server upsert persists in the background (fire-and-forget, no refetch on each keystroke).
    setStep: (procedure, stepKey, status, notes) => {
      setResults((prev) => ({
        ...prev,
        [procedure]: { results: { ...prev[procedure].results, [stepKey]: { status, notes } } },
      }));
      void setStepAction({ procedure, stepKey, status, notes });
    },
    resetProcedure: (procedure) => {
      setResults((prev) => ({ ...prev, [procedure]: { results: {} } }));
      void resetAction({ procedure });
    },
    updateEngagement: (patch) => {
      setEngagement((prev) => ({ ...prev, ...patch }));
      void updateEngAction(patch);
    },
  };
}
