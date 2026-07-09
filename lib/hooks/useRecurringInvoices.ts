"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listRecurringInvoices,
  createRecurringInvoice as createAction,
  updateRecurringInvoice as updateAction,
  deleteRecurringInvoice as deleteAction,
  generateRecurringInvoiceNow as generateAction,
} from "@/lib/server/actions/recurring-invoices";
import { type Result } from "@/lib/server/result";
import type { RecurringInvoice } from "@/types";

export interface UseRecurringInvoices {
  recurring: RecurringInvoice[];
  loading: boolean;
  createRecurring: (input: unknown) => Promise<Result<RecurringInvoice>>;
  updateRecurring: (input: unknown) => Promise<Result<RecurringInvoice>>;
  deleteRecurring: (id: string) => Promise<Result<{ id: string }>>;
  generateNow: (id: string) => Promise<Result<{ issued: number }>>;
}

export function useRecurringInvoices(): UseRecurringInvoices {
  const [recurring, setRecurring] = useState<RecurringInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRecurring(await listRecurringInvoices());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  return {
    recurring,
    loading,
    createRecurring: async (input) => {
      const r = await createAction(input);
      if (r.ok) await refresh();
      return r;
    },
    updateRecurring: async (input) => {
      const r = await updateAction(input);
      if (r.ok) await refresh();
      return r;
    },
    deleteRecurring: async (id) => {
      const r = await deleteAction({ id });
      if (r.ok) await refresh();
      return r;
    },
    generateNow: async (id) => {
      const r = await generateAction({ id });
      if (r.ok) await refresh();
      return r;
    },
  };
}
