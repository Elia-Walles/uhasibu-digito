"use client";
import { useCallback, useEffect, useState } from "react";
import { TAX_BACKEND_ENABLED } from "@/lib/flags";
import { VAT_RETURN_OCT } from "@/lib/mock-data/tax";
import { listVATReturns } from "@/lib/server/actions/tax";
import type { VATReturn } from "@/types";

export interface UseVATReturns {
  vatReturns: VATReturn[];
  loading: boolean;
}

export function useVATReturns(): UseVATReturns {
  const [serverReturns, setServerReturns] = useState<VATReturn[]>([]);
  const [loading, setLoading] = useState(TAX_BACKEND_ENABLED);

  const refresh = useCallback(async () => {
    if (!TAX_BACKEND_ENABLED) return;
    setLoading(true);
    try {
      setServerReturns(await listVATReturns());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  if (!TAX_BACKEND_ENABLED) {
    return { vatReturns: [VAT_RETURN_OCT], loading: false };
  }

  return { vatReturns: serverReturns, loading };
}
