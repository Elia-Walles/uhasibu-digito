"use client";
import { useSession } from "next-auth/react";
import { normalizeTier, tierAtLeast, type Tier } from "@/lib/auth/tiers";

export interface UseTier {
  tier: Tier;
  /** True once the session has resolved (avoids flashing gated UI before tier is known). */
  ready: boolean;
  atLeast: (min: Tier) => boolean;
}

/** The current tenant's subscription tier, derived from the Auth.js session. */
export function useTier(): UseTier {
  const { data: session, status } = useSession();
  const tier = normalizeTier(session?.user?.tier);
  return {
    tier,
    ready: status === "authenticated",
    atLeast: (min) => tierAtLeast(tier, min),
  };
}
