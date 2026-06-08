"use client";
import { useCallback, useEffect, useState } from "react";
import { listBranches, createBranch as createAction } from "@/lib/server/actions/branches";
import type { Result } from "@/lib/server/result";
import type { CreateBranchInput } from "@/lib/server/schemas/pos";
import type { Branch } from "@/types";

export interface UseBranches {
  branches: Branch[];
  loading: boolean;
  refresh: () => Promise<void>;
  createBranch: (input: CreateBranchInput) => Promise<Result<Branch>>;
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
  };
}
