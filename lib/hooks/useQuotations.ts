"use client";
import { useCallback, useEffect, useState } from "react";
import { QUOTATIONS_BACKEND_ENABLED } from "@/lib/flags";
import { useDataStore } from "@/lib/store/dataStore";
import {
  listQuotations,
  createQuotation as createAction,
  updateQuotationStatus as updateAction,
} from "@/lib/server/actions/quotations";
import { ok, type Result } from "@/lib/server/result";
import { computeInvoiceTotals } from "@/lib/utils/invoice-totals";
import type { Quotation, InvoiceLine, QuotationStatus } from "@/types";

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
  const mockQuotations = useDataStore((s) => s.quotations);
  const mockAdd = useDataStore((s) => s.addQuotation);
  const mockUpdate = useDataStore((s) => s.updateQuotationStatus);

  const [serverQuotations, setServerQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(QUOTATIONS_BACKEND_ENABLED);

  const refresh = useCallback(async () => {
    if (!QUOTATIONS_BACKEND_ENABLED) return;
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

  if (!QUOTATIONS_BACKEND_ENABLED) {
    return {
      quotations: mockQuotations,
      loading: false,
      createQuotation: async (p) => {
        const totals = computeInvoiceTotals(p.lines);
        const stamp = Date.now();
        const lines: InvoiceLine[] = p.lines.map((l, i) => ({
          id: `ql_${stamp}_${i}`,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountPct: l.discountPct,
          vatPct: l.vatPct,
          lineTotal: totals.lineTotals[i] ?? 0,
        }));
        const q: Quotation = {
          id: `quo_${stamp}`,
          number: `QUO-2024-${String(stamp).slice(-5)}`,
          customerId: p.customerId,
          customerName: p.customerName,
          date: p.date,
          validUntil: p.validUntil,
          lines,
          subtotal: totals.subtotal,
          vatAmount: totals.vatAmount,
          total: totals.total,
          status: p.status,
          notes: p.notes,
        };
        mockAdd(q);
        return ok(q);
      },
      updateQuotationStatus: async (id, status) => {
        mockUpdate(id, status);
        const found = mockQuotations.find((q) => q.id === id);
        return ok(found ?? ({ id } as Quotation));
      },
    };
  }

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
