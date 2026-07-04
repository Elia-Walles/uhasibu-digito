"use client";
import { useCallback, useEffect, useState } from "react";
import { listPOSSales, getPOSAnalytics, recordPOSSale as recordAction, createPOSInvoice, refundPOSSale } from "@/lib/server/actions/pos";
import type { Result } from "@/lib/server/result";
import type { RecordPOSSaleInput, CreatePOSInvoiceInput } from "@/lib/server/schemas/pos";
import type { POSSale, POSAnalytics, PaymentMethod } from "@/types";

export interface POSFilter {
  from?: string;
  to?: string;
  branchId?: string;
  paymentMethod?: PaymentMethod;
}

/** Record a POS sale (used by the Sales page). */
export function recordSale(input: RecordPOSSaleInput): Promise<Result<POSSale>> {
  return recordAction(input);
}

/** Create a customer invoice from the POS Invoice form. */
export function createInvoice(input: CreatePOSInvoiceInput): Promise<Result<{ id: string; number: string }>> {
  return createPOSInvoice(input);
}

/** Refund/return a completed POS sale. */
export function refundSale(saleId: string): Promise<Result<{ id: string }>> {
  return refundPOSSale({ saleId });
}

export function usePOSSales(filter: POSFilter): { sales: POSSale[]; loading: boolean; refresh: () => Promise<void> } {
  const [sales, setSales] = useState<POSSale[]>([]);
  const [loading, setLoading] = useState(true);
  const { from, to, branchId, paymentMethod } = filter;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSales(await listPOSSales({ from, to, branchId, paymentMethod }));
    } finally {
      setLoading(false);
    }
  }, [from, to, branchId, paymentMethod]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount + filter change
    void refresh();
  }, [refresh]);

  return { sales, loading, refresh };
}

export function usePOSAnalytics(filter: POSFilter): { analytics: POSAnalytics | null; loading: boolean } {
  const [analytics, setAnalytics] = useState<POSAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const { from, to, branchId, paymentMethod } = filter;

  useEffect(() => {
    let active = true;
    setLoading(true);
    void getPOSAnalytics({ from, to, branchId, paymentMethod })
      .then((a) => {
        if (active) setAnalytics(a);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [from, to, branchId, paymentMethod]);

  return { analytics, loading };
}
