"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listSubscriptionInvoices,
  approveSubscriptionInvoice,
  approveSubscriptionInvoices,
  cancelSubscriptionInvoice,
} from "@/lib/server/actions/admin/subscription-invoices";
import type { Result } from "@/lib/server/result";
import type { AdminSubscriptionInvoiceRow } from "@/lib/server/actions/admin/types";

export function useAdminSubscriptionInvoices() {
  const [invoices, setInvoices] = useState<AdminSubscriptionInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setInvoices(await listSubscriptionInvoices());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  const wrap = async <T,>(p: Promise<Result<T>>): Promise<Result<T>> => {
    const res = await p;
    if (res.ok) await refresh();
    return res;
  };

  return {
    invoices,
    loading,
    refresh,
    approve: (invoiceId: string) => wrap(approveSubscriptionInvoice({ invoiceId })),
    approveSelected: (invoiceIds: string[]) => wrap(approveSubscriptionInvoices({ invoiceIds })),
    cancel: (invoiceId: string) => wrap(cancelSubscriptionInvoice({ invoiceId })),
  };
}
