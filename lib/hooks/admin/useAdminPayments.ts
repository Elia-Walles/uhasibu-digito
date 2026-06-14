"use client";
import { useCallback, useEffect, useState } from "react";
import { listPayments, recordPayment, reversePayment } from "@/lib/server/actions/admin/payments";
import type { Result } from "@/lib/server/result";
import type { RecordPaymentInput } from "@/lib/server/schemas/admin";
import type { AdminPaymentRow } from "@/lib/server/actions/admin/types";

export function useAdminPayments() {
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setPayments(await listPayments());
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
    payments,
    loading,
    refresh,
    record: (input: RecordPaymentInput) => wrap(recordPayment(input)),
    reverse: (paymentId: string) => wrap(reversePayment({ paymentId })),
  };
}
