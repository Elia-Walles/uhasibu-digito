"use client";
import { useCallback, useEffect, useState } from "react";
import { TAX_BACKEND_ENABLED } from "@/lib/flags";
import { TAX_FILINGS } from "@/lib/mock-data/tax";
import { listTaxFilings, updateTaxStatus } from "@/lib/server/actions/tax";
import { ok, type Result } from "@/lib/server/result";
import type { TaxFiling } from "@/types";

export interface UseTaxFilings {
  taxFilings: TaxFiling[];
  loading: boolean;
  markFiled: (id: string) => Promise<Result<TaxFiling>>;
}

export function useTaxFilings(): UseTaxFilings {
  const [serverFilings, setServerFilings] = useState<TaxFiling[]>([]);
  const [loading, setLoading] = useState(TAX_BACKEND_ENABLED);

  const refresh = useCallback(async () => {
    if (!TAX_BACKEND_ENABLED) return;
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

  if (!TAX_BACKEND_ENABLED) {
    return {
      taxFilings: TAX_FILINGS,
      loading: false,
      markFiled: async (id) => {
        const f = TAX_FILINGS.find((x) => x.id === id);
        return ok({ ...(f ?? ({ id } as TaxFiling)), status: "Filed" });
      },
    };
  }

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
