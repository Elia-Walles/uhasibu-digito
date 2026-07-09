"use client";
import { useCallback, useEffect, useState } from "react";
import { listExpenses, createExpense as createAction, deleteExpense as deleteAction } from "@/lib/server/actions/expenses";
import type { CreateExpenseInput } from "@/lib/server/schemas/expenses";
import { type Result } from "@/lib/server/result";
import type { Expense } from "@/types";

export interface UseExpenses {
  expenses: Expense[];
  loading: boolean;
  refresh: () => Promise<void>;
  createExpense: (input: CreateExpenseInput) => Promise<Result<Expense>>;
  deleteExpense: (id: string) => Promise<Result<{ id: string }>>;
}

export function useExpenses(): UseExpenses {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setExpenses(await listExpenses());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  return {
    expenses,
    loading,
    refresh,
    createExpense: async (input) => {
      const r = await createAction(input);
      if (r.ok) await refresh();
      return r;
    },
    deleteExpense: async (id) => {
      const r = await deleteAction({ id });
      if (r.ok) await refresh();
      return r;
    },
  };
}
