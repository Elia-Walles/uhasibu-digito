"use server";
import { z } from "zod";
import { auth } from "@/auth";
import { authDb } from "@/lib/server/auth-db";
import { ok, err, type Result } from "@/lib/server/result";
import type { Tier } from "@/lib/auth/tiers";

const selectPlanSchema = z.object({
  tier: z.enum(["starter", "business", "standard", "premium"]),
});

/**
 * Activates a subscription plan for the current tenant (instant activation no payment
 * gateway). Writes Tenant.tier via the unscoped auth client (Tenant is a tenancy root, not
 * a tenant-scoped model). The client refreshes its session afterwards so the new tier takes
 * effect (the jwt callback re-reads the tier on `update`).
 */
export async function selectPlan(input: unknown): Promise<Result<{ tier: Tier }>> {
  const parsed = selectPlanSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid plan");

  const session = await auth();
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return err("You must be signed in to choose a plan");

  try {
    await authDb.tenant.update({ where: { id: tenantId }, data: { tier: parsed.data.tier } });
    return ok({ tier: parsed.data.tier });
  } catch {
    return err("Could not activate your plan. Please try again.");
  }
}
