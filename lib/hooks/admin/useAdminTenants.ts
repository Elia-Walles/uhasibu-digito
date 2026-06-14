"use client";
import { useCallback, useEffect, useState } from "react";
import { listTenants, setTenantTier, createTenant, updateTenant, deleteTenant } from "@/lib/server/actions/admin/tenants";
import type { Result } from "@/lib/server/result";
import type { Tier } from "@/lib/auth/tiers";
import type { AdminTenantRow } from "@/lib/server/actions/admin/types";

export function useAdminTenants() {
  const [tenants, setTenants] = useState<AdminTenantRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setTenants(await listTenants());
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
    tenants,
    loading,
    refresh,
    changeTier: (tenantId: string, tier: Tier) => wrap(setTenantTier({ tenantId, tier })),
    addTenant: (input: { name: string; slug: string; tier?: Tier }) => wrap(createTenant(input)),
    editTenant: (input: { tenantId: string; name?: string; slug?: string }) => wrap(updateTenant(input)),
    removeTenant: (tenantId: string) => wrap(deleteTenant({ tenantId })),
  };
}
