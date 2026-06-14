"use server";
import { authDb } from "@/lib/server/auth-db";
import { decToNum } from "@/lib/server/serialize";
import type { Plan, Tier } from "@/lib/auth/tiers";

/**
 * The active subscription plans for public display (landing, /pricing) and the authenticated
 * plan surfaces (select-plan, settings/subscription). NO auth required: Plan is a platform
 * model (not in TENANT_SCOPED_MODELS), so it's read via the unscoped authDb with no tenant
 * context. Returns the shared `Plan` shape so components/billing/PricingCard consumes it directly.
 */
export async function getPublicPlans(): Promise<Plan[]> {
  const rows = await authDb.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return rows.map((r) => {
    let features: string[] = [];
    try {
      const parsed = JSON.parse(r.features);
      if (Array.isArray(parsed)) features = parsed.filter((x): x is string => typeof x === "string");
    } catch {
      features = [];
    }
    return {
      id: r.key as Exclude<Tier, "free">,
      name: r.name,
      priceTzs: decToNum(r.priceTzs),
      tagline: r.tagline,
      highlighted: r.highlighted,
      features,
    };
  });
}
