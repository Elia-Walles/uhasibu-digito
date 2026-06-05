"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listEmployees,
  createEmployee as createAction,
  updateEmployee as updateAction,
  deleteEmployee as deleteAction,
} from "@/lib/server/actions/payroll";
import { type Result } from "@/lib/server/result";
import type { Employee } from "@/types";

export interface UseEmployees {
  employees: Employee[];
  loading: boolean;
  addEmployee: (e: Employee) => Promise<Result<Employee>>;
  updateEmployee: (id: string, e: Employee) => Promise<Result<Employee>>;
  removeEmployee: (id: string) => Promise<Result<{ id: string }>>;
}

export function useEmployees(): UseEmployees {
  const [serverEmployees, setServerEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setServerEmployees(await listEmployees());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  return {
    employees: serverEmployees,
    loading,
    addEmployee: async (e) => {
      const r = await createAction(e);
      if (r.ok) await refresh();
      return r;
    },
    updateEmployee: async (id, e) => {
      const r = await updateAction({ ...e, id });
      if (r.ok) await refresh();
      return r;
    },
    removeEmployee: async (id) => {
      const r = await deleteAction({ id });
      if (r.ok) await refresh();
      return r;
    },
  };
}
