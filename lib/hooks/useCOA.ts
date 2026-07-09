"use client";
import { useCallback, useEffect, useState } from "react";
import { getChartOfAccounts } from "@/lib/server/actions/ledger";
import type { COAAccount } from "@/types";

export interface UseCOA {
  accounts: COAAccount[];
  loading: boolean;
}

export function useCOA(): UseCOA {
  const [accounts, setAccounts] = useState<COAAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setAccounts(await getChartOfAccounts());
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
