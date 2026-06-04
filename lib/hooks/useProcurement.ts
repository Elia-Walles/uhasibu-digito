"use client";
import { useCallback, useEffect, useState } from "react";
import { PROCUREMENT_BACKEND_ENABLED } from "@/lib/flags";
import { useDataStore } from "@/lib/store/dataStore";
import {
  listSuppliers,
  listPurchaseOrders,
  createSupplier as createSupplierAction,
  createPurchaseOrder as createPOAction,
  updatePOMatch as updatePOMatchAction,
} from "@/lib/server/actions/procurement";
import { ok, type Result } from "@/lib/server/result";
import { computeInvoiceTotals } from "@/lib/utils/invoice-totals";
import type { Supplier, PurchaseOrder, POLine } from "@/types";

export interface CreatePOLine {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CreatePOPayload {
  supplierId: string;
  supplierName: string;
  date: string;
  expectedDelivery: string;
  lines: CreatePOLine[];
}

type MatchPatch = Partial<PurchaseOrder["matchStatus"]>;

export interface UseProcurement {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  loading: boolean;
  createSupplier: (s: Supplier) => Promise<Result<Supplier>>;
  createPurchaseOrder: (p: CreatePOPayload) => Promise<Result<PurchaseOrder>>;
  updatePOMatch: (id: string, patch: MatchPatch) => Promise<Result<PurchaseOrder | { id: string }>>;
}

function toSupplierInput(s: Supplier) {
  return {
    name: s.name,
    contactPerson: s.contactPerson,
    tin: s.tin,
    phone: s.phone,
    email: s.email,
    city: s.city,
    address: s.address,
    paymentTerms: s.paymentTerms,
    creditLimit: s.creditLimit,
    performanceRating: s.performanceRating,
    bankName: s.bankName,
    bankAccount: s.bankAccount,
  };
}

export function useProcurement(): UseProcurement {
  const mockSuppliers = useDataStore((s) => s.suppliers);
  const mockPOs = useDataStore((s) => s.purchaseOrders);
  const mockAddSupplier = useDataStore((s) => s.addSupplier);
  const mockAddPO = useDataStore((s) => s.addPurchaseOrder);
  const mockUpdateMatch = useDataStore((s) => s.updatePOMatch);

  const [serverSuppliers, setServerSuppliers] = useState<Supplier[]>([]);
  const [serverPOs, setServerPOs] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(PROCUREMENT_BACKEND_ENABLED);

  const refresh = useCallback(async () => {
    if (!PROCUREMENT_BACKEND_ENABLED) return;
    setLoading(true);
    try {
      const [sup, pos] = await Promise.all([listSuppliers(), listPurchaseOrders()]);
      setServerSuppliers(sup);
      setServerPOs(pos);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  if (!PROCUREMENT_BACKEND_ENABLED) {
    return {
      suppliers: mockSuppliers,
      purchaseOrders: mockPOs,
      loading: false,
      createSupplier: async (s) => {
        mockAddSupplier(s);
        return ok(s);
      },
      createPurchaseOrder: async (p) => {
        const totals = computeInvoiceTotals(
          p.lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice, discountPct: 0 })),
        );
        const stamp = Date.now();
        const lines: POLine[] = p.lines.map((l, i) => ({
          id: `pol_${stamp}_${i}`,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lineTotal: totals.lineTotals[i] ?? 0,
        }));
        const po: PurchaseOrder = {
          id: `po_${stamp}`,
          number: `PO-2024-${String(stamp).slice(-5)}`,
          supplierId: p.supplierId,
          supplierName: p.supplierName,
          date: p.date,
          expectedDelivery: p.expectedDelivery,
          lines,
          subtotal: totals.subtotal,
          vatAmount: totals.vatAmount,
          total: totals.total,
          status: "Draft",
          matchStatus: { poConfirmed: false, grnReceived: false, invoiceReceived: false },
        };
        mockAddPO(po);
        return ok(po);
      },
      updatePOMatch: async (id, patch) => {
        mockUpdateMatch(id, patch);
        return ok({ id });
      },
    };
  }

  return {
    suppliers: serverSuppliers,
    purchaseOrders: serverPOs,
    loading,
    createSupplier: async (s) => {
      const r = await createSupplierAction(toSupplierInput(s));
      if (r.ok) await refresh();
      return r;
    },
    createPurchaseOrder: async (p) => {
      const r = await createPOAction(p);
      if (r.ok) await refresh();
      return r;
    },
    updatePOMatch: async (id, patch) => {
      const r = await updatePOMatchAction({ id, ...patch });
      if (r.ok) await refresh();
      return r;
    },
  };
}
