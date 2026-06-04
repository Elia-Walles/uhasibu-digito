"use client";
import { useCallback, useEffect, useState } from "react";
import { CUSTOMERS_BACKEND_ENABLED } from "@/lib/flags";
import { useDataStore } from "@/lib/store/dataStore";
import { listCustomers, createCustomer as createCustomerAction } from "@/lib/server/actions/customers";
import { ok, type Result } from "@/lib/server/result";
import type { Customer } from "@/types";

export interface UseCustomers {
  customers: Customer[];
  loading: boolean;
  /** Accepts a Customer-shaped object; the backend ignores client id/derived fields. */
  createCustomer: (c: Customer) => Promise<Result<Customer>>;
}

function toCreateInput(c: Customer) {
  return {
    name: c.name,
    contactPerson: c.contactPerson,
    tin: c.tin,
    phone: c.phone,
    email: c.email,
    city: c.city,
    address: c.address,
    creditLimit: c.creditLimit,
    paymentTerms: c.paymentTerms,
    status: c.status,
    ...(c.country !== undefined && { country: c.country }),
    ...(c.swiftBic !== undefined && { swiftBic: c.swiftBic }),
    ...(c.beneficiaryBank !== undefined && { beneficiaryBank: c.beneficiaryBank }),
    ...(c.iban !== undefined && { iban: c.iban }),
    ...(c.isInternational !== undefined && { isInternational: c.isInternational }),
  };
}

export function useCustomers(): UseCustomers {
  const mockCustomers = useDataStore((s) => s.customers);
  const mockAdd = useDataStore((s) => s.addCustomer);

  const [serverCustomers, setServerCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(CUSTOMERS_BACKEND_ENABLED);

  const refresh = useCallback(async () => {
    if (!CUSTOMERS_BACKEND_ENABLED) return;
    setLoading(true);
    try {
      setServerCustomers(await listCustomers());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  if (!CUSTOMERS_BACKEND_ENABLED) {
    return {
      customers: mockCustomers,
      loading: false,
      createCustomer: async (c) => {
        mockAdd(c);
        return ok(c);
      },
    };
  }

  return {
    customers: serverCustomers,
    loading,
    createCustomer: async (c) => {
      const res = await createCustomerAction(toCreateInput(c));
      if (res.ok) await refresh();
      return res;
    },
  };
}
