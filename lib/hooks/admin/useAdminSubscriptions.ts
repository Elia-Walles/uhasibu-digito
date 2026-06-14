"use client";
import { useCallback, useEffect, useState } from "react";
import { listSubscriptions, upsertSubscription, cancelSubscription } from "@/lib/server/actions/admin/subscriptions";
import type { Result } from "@/lib/server/result";
import type { AdminSubscriptionRow } from "@/lib/server/actions/admin/types";

type PlanKey = "starter" | "business" | "standard" | "premium";

export function useAdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSubscriptions(await listSubscriptions());
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
    subscriptions,
    loading,
    refresh,
    upsert: (input: { tenantId: string; planKey: PlanKey; amountTzs: number; currentPeriodEnd?: Date }) =>
      wrap(upsertSubscription(input)),
    cancel: (subscriptionId: string) => wrap(cancelSubscription({ subscriptionId })),
  };
}
