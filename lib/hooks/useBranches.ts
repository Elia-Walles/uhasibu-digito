"use client";
import { useCallback, useEffect, useState } from "react";
import { listBranches, createBranch as createAction, updateBranch as updateAction, deleteBranch as deleteAction } from "@/lib/server/actions/branches";
import type { Result } from "@/lib/server/result";
import type { CreateBranchInput, UpdateBranchInput } from "@/lib/server/schemas/pos";
import type { Branch } from "@/types";

export interface UseBranches {
  branches: Branch[];
  loading: boolean;
  refresh: () => Promise<void>;
  createBranch: (input: CreateBranchInput) => Promise<Result<Branch>>;
  updateBranch: (input: UpdateBranchInput) => Promise<Result<Branch>>;
  deleteBranch: (id: string) => Promise<Result<{ id: string }>>;
}

export function useBranches(): UseBranches {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setBranches(await listBranches());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  return {
    branches,
    loading,
    refresh,
    createBranch: async (input) => {
      const r = await createAction(input);
      if (r.ok) await refresh();
      return r;
    },
    updateBranch: async (input) => {
      const r = await updateAction(input);
      if (r.ok) await refresh();
      return r;
    },
    deleteBranch: async (id) => {
      const r = await deleteAction({ id });
      if (r.ok) await refresh();
      return r;
    },
  };
}
