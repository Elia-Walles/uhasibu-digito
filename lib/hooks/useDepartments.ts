"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listDepartments,
  createDepartment,
  renameDepartment as renameDepartmentAction,
  deleteDepartment,
} from "@/lib/server/actions/departments";
import { type Result } from "@/lib/server/result";
import type { Department } from "@/types";

export interface UseDepartments {
  departments: Department[];
  loading: boolean;
  countEmployeesInDepartment: (name: string) => number;
  addDepartment: (name: string) => Promise<Result<Department>>;
  renameDepartment: (id: string, name: string) => Promise<Result<Department>>;
  removeDepartment: (id: string) => Promise<Result<{ id: string }>>;
}

export function useDepartments(): UseDepartments {
  const [serverDepartments, setServerDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
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

  return {
    departments: serverDepartments,
    loading,
    // Employee-by-department counts are not surfaced in this view; the delete guard relies on
    // the server's referential checks.
    countEmployeesInDepartment: () => 0,
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
