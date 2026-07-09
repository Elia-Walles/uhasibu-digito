"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listSuppliers,
  listPurchaseOrders,
  createSupplier as createSupplierAction,
  createPurchaseOrder as createPOAction,
  updatePOMatch as updatePOMatchAction,
  recordSupplierPayment as recordSupplierPaymentAction,
} from "@/lib/server/actions/procurement";
import { type Result } from "@/lib/server/result";
import type { Supplier, PurchaseOrder } from "@/types";

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
  recordSupplierPayment: (input: { supplierId: string; amount: number; method: string; reference?: string }) => Promise<Result<{ id: string; amount: number }>>;
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
  const [serverSuppliers, setServerSuppliers] = useState<Supplier[]>([]);
  const [serverPOs, setServerPOs] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
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
    recordSupplierPayment: async (input) => {
      const r = await recordSupplierPaymentAction(input);
      if (r.ok) await refresh();
      return r;
    },
  };
}
