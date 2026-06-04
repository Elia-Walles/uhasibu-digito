"use client";
import { useCallback, useEffect, useState } from "react";
import { PAYROLL_BACKEND_ENABLED } from "@/lib/flags";
import { useDataStore } from "@/lib/store/dataStore";
import {
  listEmployees,
  createEmployee as createAction,
  updateEmployee as updateAction,
  deleteEmployee as deleteAction,
} from "@/lib/server/actions/payroll";
import { ok, type Result } from "@/lib/server/result";
import type { Employee } from "@/types";

export interface UseEmployees {
  employees: Employee[];
  loading: boolean;
  addEmployee: (e: Employee) => Promise<Result<Employee>>;
  updateEmployee: (id: string, e: Employee) => Promise<Result<Employee>>;
  removeEmployee: (id: string) => Promise<Result<{ id: string }>>;
}

export function useEmployees(): UseEmployees {
  const mockEmployees = useDataStore((s) => s.employees);
  const mockAdd = useDataStore((s) => s.addEmployee);
  const mockUpdate = useDataStore((s) => s.updateEmployee);
  const mockRemove = useDataStore((s) => s.removeEmployee);

  const [serverEmployees, setServerEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(PAYROLL_BACKEND_ENABLED);

  const refresh = useCallback(async () => {
    if (!PAYROLL_BACKEND_ENABLED) return;
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

  if (!PAYROLL_BACKEND_ENABLED) {
    return {
      employees: mockEmployees,
      loading: false,
      addEmployee: async (e) => {
        mockAdd(e);
        return ok(e);
      },
      updateEmployee: async (id, e) => {
        mockUpdate(id, e);
        return ok(e);
      },
      removeEmployee: async (id) => {
        mockRemove(id);
        return ok({ id });
      },
    };
  }

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
