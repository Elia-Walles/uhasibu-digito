"use client";
import { useCallback, useEffect, useState } from "react";
import { listBudgetLines, createBudgetLine as createAction } from "@/lib/server/actions/crm";
import { type Result } from "@/lib/server/result";
import type { BudgetLine } from "@/types";

export interface NewBudgetLine {
  lineItem: string;
  category: string;
  annualBudget: number;
  coaAccountCode?: string;
}

export interface UseBudgetLines {
  budgetLines: BudgetLine[];
  loading: boolean;
  addBudgetLine: (line: NewBudgetLine) => Promise<Result<BudgetLine>>;
}

export function useBudgetLines(): UseBudgetLines {
  const [serverLines, setServerLines] = useState<BudgetLine[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setServerLines(await listBudgetLines());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  return {
    budgetLines: serverLines,
    loading,
    addBudgetLine: async (line) => {
      const r = await createAction(line);
      if (r.ok) await refresh();
      return r;
    },
  };
}
