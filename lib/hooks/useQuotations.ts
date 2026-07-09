"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listQuotations,
  createQuotation as createAction,
  updateQuotationStatus as updateAction,
  convertQuotation as convertAction,
} from "@/lib/server/actions/quotations";
import { type Result } from "@/lib/server/result";
import type { Quotation, Invoice } from "@/types";

export type ManualQuotationStatus = "Draft" | "Sent" | "Accepted" | "Expired";

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
  updateQuotationStatus: (id: string, status: ManualQuotationStatus) => Promise<Result<Quotation>>;
  convertQuotation: (quotationId: string) => Promise<Result<Invoice>>;
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
    updateQuotationStatus: async (id, status) => {
      const r = await updateAction({ id, status });
      if (r.ok) await refresh();
      return r;
    },
    convertQuotation: async (quotationId) => {
      const r = await convertAction({ quotationId });
      if (r.ok) await refresh();
      return r;
    },
  };
}
