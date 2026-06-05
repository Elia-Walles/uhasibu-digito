"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listQuotations,
  createQuotation as createAction,
  updateQuotationStatus as updateAction,
} from "@/lib/server/actions/quotations";
import { type Result } from "@/lib/server/result";
import type { Quotation, QuotationStatus } from "@/types";

export interface CreateQuotationLine {
  description: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  vatPct: number;
}

export interface CreateQuotationPayload {
  customerId: string;
  customerName: string;
  date: string;
  validUntil: string;
  notes: string;
  status: "Draft" | "Sent";
  lines: CreateQuotationLine[];
}

export interface UseQuotations {
  quotations: Quotation[];
  loading: boolean;
  createQuotation: (p: CreateQuotationPayload) => Promise<Result<Quotation>>;
  updateQuotationStatus: (
    id: string,
    status: QuotationStatus,
    convertedInvoiceId?: string,
  ) => Promise<Result<Quotation>>;
}

export function useQuotations(): UseQuotations {
  const [serverQuotations, setServerQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setServerQuotations(await listQuotations());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  return {
    quotations: serverQuotations,
    loading,
    createQuotation: async (p) => {
      const r = await createAction(p);
      if (r.ok) await refresh();
      return r;
    },
    updateQuotationStatus: async (id, status, convertedInvoiceId) => {
      const r = await updateAction({ id, status, ...(convertedInvoiceId ? { convertedInvoiceId } : {}) });
      if (r.ok) await refresh();
      return r;
    },
  };
}
