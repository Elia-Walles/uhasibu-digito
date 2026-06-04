"use client";
import { useCallback, useEffect, useState } from "react";
import { listVATReturns } from "@/lib/server/actions/tax";
import type { VATReturn } from "@/types";

export interface UseVATReturns {
  vatReturns: VATReturn[];
  loading: boolean;
}

export function useVATReturns(): UseVATReturns {
  const [serverReturns, setServerReturns] = useState<VATReturn[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
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

  return { vatReturns: serverReturns, loading };
}
