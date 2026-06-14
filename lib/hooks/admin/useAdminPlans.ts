"use client";
import { useCallback, useEffect, useState } from "react";
import { listPlans, createPlan, updatePlan, togglePlanActive } from "@/lib/server/actions/admin/plans";
import type { Result } from "@/lib/server/result";
import type { PlanInput } from "@/lib/server/schemas/admin";
import type { AdminPlanRow } from "@/lib/server/actions/admin/types";

export function useAdminPlans() {
  const [plans, setPlans] = useState<AdminPlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setPlans(await listPlans());
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
    plans,
    loading,
    refresh,
    addPlan: (input: PlanInput) => wrap(createPlan(input)),
    editPlan: (input: Partial<PlanInput> & { id: string }) => wrap(updatePlan(input)),
    toggleActive: (id: string, isActive: boolean) => wrap(togglePlanActive({ id, isActive })),
  };
}
