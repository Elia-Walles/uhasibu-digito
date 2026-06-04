"use client";
import { useCallback, useEffect, useState } from "react";
import { PAYROLL_BACKEND_ENABLED } from "@/lib/flags";
import { PAYROLL_RUNS } from "@/lib/mock-data/payroll";
import {
  listPayrollRuns,
  createPayrollRun as createAction,
  updatePayrollRunStatus as updateStatusAction,
} from "@/lib/server/actions/payroll";
import { ok, type Result } from "@/lib/server/result";
import type { PayrollRun, PayrollRunStatus } from "@/types";

export interface CreatePayrollRunInput {
  year: number;
  month: number;
  period: string;
}

export interface UsePayrollRuns {
  payrollRuns: PayrollRun[];
  loading: boolean;
  createPayrollRun: (input: CreatePayrollRunInput) => Promise<Result<{ id: string; period: string }>>;
  updatePayrollRunStatus: (id: string, status: PayrollRunStatus) => Promise<Result<{ id: string }>>;
}

export function usePayrollRuns(): UsePayrollRuns {
  const [serverRuns, setServerRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(PAYROLL_BACKEND_ENABLED);

  const refresh = useCallback(async () => {
    if (!PAYROLL_BACKEND_ENABLED) return;
    setLoading(true);
    try {
      setServerRuns(await listPayrollRuns());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  if (!PAYROLL_BACKEND_ENABLED) {
    // Mock has no payroll-run store; reads the static runs and the create is a no-op.
    return {
      payrollRuns: PAYROLL_RUNS,
      loading: false,
      createPayrollRun: async (input) => ok({ id: `pr_${input.period}`, period: input.period }),
      updatePayrollRunStatus: async (id) => ok({ id }),
    };
  }

  return {
    payrollRuns: serverRuns,
    loading,
    createPayrollRun: async (input) => {
      const r = await createAction(input);
      if (r.ok) await refresh();
      return r;
    },
    updatePayrollRunStatus: async (id, status) => {
      const r = await updateStatusAction({ id, status });
      if (r.ok) await refresh();
      return r;
    },
  };
}
