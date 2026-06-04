"use client";
import { useCallback, useEffect, useState } from "react";
import { listTaxFilings, updateTaxStatus } from "@/lib/server/actions/tax";
import { type Result } from "@/lib/server/result";
import type { TaxFiling } from "@/types";

export interface UseTaxFilings {
  taxFilings: TaxFiling[];
  loading: boolean;
  markFiled: (id: string) => Promise<Result<TaxFiling>>;
}

export function useTaxFilings(): UseTaxFilings {
  const [serverFilings, setServerFilings] = useState<TaxFiling[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setServerFilings(await listTaxFilings());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  return {
    taxFilings: serverFilings,
    loading,
    markFiled: async (id) => {
      const r = await updateTaxStatus({ id, status: "Filed" });
      if (r.ok) await refresh();
      return r;
    },
  };
}
