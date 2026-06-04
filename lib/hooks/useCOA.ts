"use client";
import { useCallback, useEffect, useState } from "react";
import { LEDGER_BACKEND_ENABLED } from "@/lib/flags";
import { COA } from "@/lib/mock-data/gl-entries";
import { listCOAAccounts } from "@/lib/server/actions/ledger";
import type { COAAccount } from "@/types";

export interface UseCOA {
  accounts: COAAccount[];
  loading: boolean;
}

export function useCOA(): UseCOA {
  const [accounts, setAccounts] = useState<COAAccount[]>(LEDGER_BACKEND_ENABLED ? [] : COA);
  const [loading, setLoading] = useState(LEDGER_BACKEND_ENABLED);

  const refresh = useCallback(async () => {
    if (!LEDGER_BACKEND_ENABLED) return;
    setLoading(true);
    try {
      setAccounts(await listCOAAccounts());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  return { accounts, loading };
}
