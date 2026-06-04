"use client";
import { useCallback, useEffect, useState } from "react";
import { BUDGETS_BACKEND_ENABLED } from "@/lib/flags";
import { useDataStore } from "@/lib/store/dataStore";
import { listBudgetLines, createBudgetLine as createAction } from "@/lib/server/actions/crm";
import { ok, type Result } from "@/lib/server/result";
import type { BudgetLine } from "@/types";

export interface UseBudgetLines {
  budgetLines: BudgetLine[];
  loading: boolean;
  addBudgetLine: (line: BudgetLine) => Promise<Result<BudgetLine>>;
}

function toCreateInput(b: BudgetLine) {
  return {
    lineItem: b.lineItem,
    category: b.category,
    annualBudget: b.annualBudget,
    mtdBudget: b.mtdBudget,
    mtdActual: b.mtdActual,
    mtdVariance: b.mtdVariance,
    ytdBudget: b.ytdBudget,
    ytdActual: b.ytdActual,
    ytdVariance: b.ytdVariance,
  };
}

export function useBudgetLines(): UseBudgetLines {
  const mockLines = useDataStore((s) => s.budgetLines);
  const mockAdd = useDataStore((s) => s.addBudgetLine);

  const [serverLines, setServerLines] = useState<BudgetLine[]>([]);
  const [loading, setLoading] = useState(BUDGETS_BACKEND_ENABLED);

  const refresh = useCallback(async () => {
    if (!BUDGETS_BACKEND_ENABLED) return;
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

  if (!BUDGETS_BACKEND_ENABLED) {
    return {
      budgetLines: mockLines,
      loading: false,
      addBudgetLine: async (line) => {
        mockAdd(line);
        return ok(line);
      },
    };
  }

  return {
    budgetLines: serverLines,
    loading,
    addBudgetLine: async (line) => {
      const r = await createAction(toCreateInput(line));
      if (r.ok) await refresh();
      return r;
    },
  };
}
