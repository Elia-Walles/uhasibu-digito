"use client";
import { useCallback, useEffect, useState } from "react";
import { DEPARTMENTS_BACKEND_ENABLED } from "@/lib/flags";
import { useDataStore } from "@/lib/store/dataStore";
import {
  listDepartments,
  createDepartment,
  renameDepartment as renameDepartmentAction,
  deleteDepartment,
} from "@/lib/server/actions/departments";
import { ok, err, type Result } from "@/lib/server/result";
import type { Department } from "@/types";

export interface UseDepartments {
  departments: Department[];
  loading: boolean;
  countEmployeesInDepartment: (name: string) => number;
  addDepartment: (name: string) => Promise<Result<Department>>;
  renameDepartment: (id: string, name: string) => Promise<Result<Department>>;
  removeDepartment: (id: string) => Promise<Result<{ id: string }>>;
}

/**
 * Flag-gated Department facade. Same surface in both modes so the page is mode-blind.
 * Backend ON → tenant-scoped Server Actions. OFF → the Zustand mock. The employee
 * count stays client-side over the mock dataset until the Employee cutover (Wave 7).
 */
export function useDepartments(): UseDepartments {
  const mockDepartments = useDataStore((s) => s.departments);
  const mockAdd = useDataStore((s) => s.addDepartment);
  const mockRename = useDataStore((s) => s.renameDepartment);
  const mockRemove = useDataStore((s) => s.removeDepartment);
  const countEmployeesInDepartment = useDataStore((s) => s.countEmployeesInDepartment);

  const [serverDepartments, setServerDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(DEPARTMENTS_BACKEND_ENABLED);

  const refresh = useCallback(async () => {
    if (!DEPARTMENTS_BACKEND_ENABLED) return;
    setLoading(true);
    try {
      setServerDepartments(await listDepartments());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  if (!DEPARTMENTS_BACKEND_ENABLED) {
    return {
      departments: mockDepartments,
      loading: false,
      countEmployeesInDepartment,
      addDepartment: async (name) => {
        const trimmed = name.trim();
        if (mockDepartments.some((d) => d.name.toLowerCase() === trimmed.toLowerCase())) {
          return err(`Department "${trimmed}" already exists`);
        }
        mockAdd(trimmed);
        return ok({ id: `mock_${trimmed}`, name: trimmed });
      },
      renameDepartment: async (id, name) => {
        mockRename(id, name);
        return ok({ id, name: name.trim() });
      },
      removeDepartment: async (id) => {
        mockRemove(id);
        return ok({ id });
      },
    };
  }

  return {
    departments: serverDepartments,
    loading,
    countEmployeesInDepartment,
    addDepartment: async (name) => {
      const res = await createDepartment({ name });
      if (res.ok) await refresh();
      return res;
    },
    renameDepartment: async (id, name) => {
      const res = await renameDepartmentAction({ id, name });
      if (res.ok) await refresh();
      return res;
    },
    removeDepartment: async (id) => {
      const res = await deleteDepartment({ id });
      if (res.ok) await refresh();
      return res;
    },
  };
}
