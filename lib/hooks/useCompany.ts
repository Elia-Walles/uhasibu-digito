"use client";
import { useCallback, useEffect, useState } from "react";
import { getCompany, updateCompany as updateAction } from "@/lib/server/actions/company";
import type { Result } from "@/lib/server/result";
import type { UpdateCompanyInput } from "@/lib/server/schemas/company";
import type { Company } from "@/types";

export interface UseCompany {
  company: Company | null;
  loading: boolean;
  refresh: () => Promise<void>;
  save: (patch: UpdateCompanyInput) => Promise<Result<Company>>;
}

export function useCompany(): UseCompany {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setCompany(await getCompany());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  return {
    company,
    loading,
    refresh,
    save: async (patch) => {
      const r = await updateAction(patch);
      if (r.ok) setCompany(r.data);
      return r;
    },
  };
}
