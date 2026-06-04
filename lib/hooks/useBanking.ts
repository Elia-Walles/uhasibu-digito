"use client";
import { useCallback, useEffect, useState } from "react";
import { LEDGER_BACKEND_ENABLED } from "@/lib/flags";
import { useDataStore } from "@/lib/store/dataStore";
import { listBankAccounts, markAccountReconciled } from "@/lib/server/actions/banking";
import { ok, type Result } from "@/lib/server/result";
import type { BankAccount } from "@/types";

export interface UseBanking {
  bankAccounts: BankAccount[];
  loading: boolean;
  reconcileAccount: (bankAccountId: string) => Promise<Result<{ count: number }>>;
}

export function useBanking(): UseBanking {
  const mockBanks = useDataStore((s) => s.bankAccounts);

  const [serverBanks, setServerBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(LEDGER_BACKEND_ENABLED);

  const refresh = useCallback(async () => {
    if (!LEDGER_BACKEND_ENABLED) return;
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

  if (!LEDGER_BACKEND_ENABLED) {
    return {
      bankAccounts: mockBanks,
      loading: false,
      reconcileAccount: async () => ok({ count: 0 }),
    };
  }

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
