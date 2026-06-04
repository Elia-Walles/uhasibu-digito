"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listPayrollRuns,
  createPayrollRun as createAction,
  updatePayrollRunStatus as updateStatusAction,
} from "@/lib/server/actions/payroll";
import { type Result } from "@/lib/server/result";
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
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
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
