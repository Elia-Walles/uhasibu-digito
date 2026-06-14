"use client";
import { useEffect, useState } from "react";
import { getPublicPlans } from "@/lib/server/actions/public-plans";
import type { Plan } from "@/lib/auth/tiers";

/** One-shot fetch of the active, admin-managed plans for authenticated client surfaces. */
export function usePublicPlans(): { plans: Plan[]; loading: boolean } {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getPublicPlans().then((p) => {
      if (cancelled) return;
      setPlans(p);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { plans, loading };
}
