"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listBankAccounts,
  markAccountReconciled,
  createBankAccount as createAction,
  addStatementLine as addStatementLineAction,
  revalueForeignBalances as revalueAction,
  type StatementLine,
} from "@/lib/server/actions/banking";
import { type Result } from "@/lib/server/result";
import type { BankAccount } from "@/types";

export interface CreateBankAccountInput {
  bankName: string;
  accountName: string;
  accountNumber: string;
  currency: "TZS" | "USD" | "EUR";
  coaAccountCode: string;
  openingBalance: number;
  exchangeRate: number;
}

export interface UseBanking {
  bankAccounts: BankAccount[];
  loading: boolean;
  refresh: () => Promise<void>;
  reconcileAccount: (bankAccountId: string) => Promise<Result<{ count: number }>>;
  createBankAccount: (input: CreateBankAccountInput) => Promise<Result<BankAccount>>;
  addStatementLine: (input: { bankAccountId: string; date: string; description: string; amount: number; reference?: string }) => Promise<Result<{ id: string; matched: boolean }>>;
  revalueFx: (input: { bankAccountId: string; rate: number }) => Promise<Result<{ delta: number }>>;
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
    refresh,
    reconcileAccount: async (id) => {
      const r = await markAccountReconciled({ bankAccountId: id });
      if (r.ok) await refresh();
      return r;
    },
    createBankAccount: async (input) => {
      const r = await createAction(input);
      if (r.ok) await refresh();
      return r;
    },
    addStatementLine: async (input) => {
      const r = await addStatementLineAction(input);
      if (r.ok) await refresh();
      return r;
    },
    revalueFx: async (input) => {
      const r = await revalueAction(input);
      if (r.ok) await refresh();
      return r;
    },
  };
}

export type { StatementLine };
