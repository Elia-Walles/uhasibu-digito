"use server";
import { adminDb } from "@/lib/server/admin-db";
import { withAdminAuth } from "@/lib/server/with-admin-auth";
import { decToNum } from "@/lib/server/serialize";
import { normalizeTier, type Tier } from "@/lib/auth/tiers";
import { monthlyAmount } from "./_shared";
import type { PlatformOverview } from "./types";

const TIERS: Tier[] = ["free", "starter", "business", "standard", "premium"];

export async function getPlatformOverview(): Promise<PlatformOverview> {
  return withAdminAuth(async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [tenants, totalUsers, superAdmins, activeSubs, payAgg, signupsThisMonth] = await Promise.all([
      adminDb.tenant.findMany({ select: { tier: true } }),
      adminDb.user.count(),
      adminDb.user.count({ where: { isSuperAdmin: true } }),
      adminDb.subscription.findMany({ where: { status: "active" }, include: { plan: { select: { interval: true } } } }),
      adminDb.payment.aggregate({
        where: { status: "recorded", paidAt: { gte: monthStart } },
        _sum: { amountTzs: true },
      }),
      adminDb.tenant.count({ where: { createdAt: { gte: monthStart } } }),
    ]);

    const mrr = activeSubs.reduce((s, sub) => s + monthlyAmount(sub.amountTzs, sub.plan.interval), 0);

    const byTier = new Map<Tier, number>(TIERS.map((t) => [t, 0]));
    for (const t of tenants) {
      const tier = normalizeTier(t.tier);
      byTier.set(tier, (byTier.get(tier) ?? 0) + 1);
    }

    return {
      totalTenants: tenants.length,
      activeTenants: activeSubs.length,
      totalUsers,
      superAdmins,
      mrrTzs: mrr,
      arrTzs: mrr * 12,
      paymentsThisMonthTzs: payAgg._sum.amountTzs ? decToNum(payAgg._sum.amountTzs) : 0,
      signupsThisMonth,
      tenantsByTier: TIERS.map((tier) => ({ tier, count: byTier.get(tier) ?? 0 })),
    };
  });
}
