"use client";
import { useCallback, useEffect, useState } from "react";
import { listBankAccounts, markAccountReconciled } from "@/lib/server/actions/banking";
import { type Result } from "@/lib/server/result";
import type { BankAccount } from "@/types";

export interface UseBanking {
  bankAccounts: BankAccount[];
  loading: boolean;
  reconcileAccount: (bankAccountId: string) => Promise<Result<{ count: number }>>;
}

export function useBanking(): UseBanking {
  const [serverBanks, setServerBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setServerBanks(await listBankAccounts());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  return {
    bankAccounts: serverBanks,
    loading,
    reconcileAccount: async (id) => {
      const r = await markAccountReconciled({ bankAccountId: id });
      if (r.ok) await refresh();
      return r;
    },
  };
}
