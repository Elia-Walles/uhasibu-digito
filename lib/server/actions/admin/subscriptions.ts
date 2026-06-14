"use server";
import { adminDb } from "@/lib/server/admin-db";
import { withAdminAuth } from "@/lib/server/with-admin-auth";
import { writePlatformAudit } from "@/lib/server/admin-audit";
import { upsertSubscriptionSchema, subscriptionIdSchema, tenantIdSchema } from "@/lib/server/schemas/admin";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum, iso } from "@/lib/server/serialize";
import type { AdminSubscriptionRow } from "./types";

function rowToSub(s: {
  id: string;
  tenantId: string;
  status: string;
  amountTzs: { toNumber(): number } | number;
  startedAt: Date;
  currentPeriodEnd: Date | null;
  plan: { name: string; key: string };
  tenant?: { name: string } | null;
}): AdminSubscriptionRow {
  return {
    id: s.id,
    tenantId: s.tenantId,
    tenantName: s.tenant?.name ?? null,
    planName: s.plan.name,
    planKey: s.plan.key,
    status: s.status,
    amountTzs: decToNum(s.amountTzs),
    startedAt: iso(s.startedAt),
    currentPeriodEnd: s.currentPeriodEnd ? iso(s.currentPeriodEnd) : null,
  };
}

export async function listSubscriptions(): Promise<AdminSubscriptionRow[]> {
  return withAdminAuth(async () => {
    const rows = await adminDb.subscription.findMany({
      orderBy: { startedAt: "desc" },
      include: { plan: true },
    });
    const tenantNames = new Map(
      (await adminDb.tenant.findMany({ select: { id: true, name: true } })).map((t) => [t.id, t.name]),
    );
    return rows.map((s) => rowToSub({ ...s, tenant: { name: tenantNames.get(s.tenantId) ?? "" } }));
  });
}

export async function getTenantSubscription(input: unknown): Promise<Result<AdminSubscriptionRow | null>> {
  const parsed = tenantIdSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { tenantId } = parsed.data;
  return withAdminAuth(async () => {
    const s = await adminDb.subscription.findFirst({
      where: { tenantId, status: "active" },
      orderBy: { startedAt: "desc" },
      include: { plan: true },
    });
    return ok(s ? rowToSub(s) : null);
  });
}

/**
 * Create or replace a tenant's active subscription against a plan, and sync Tenant.tier
 * to the plan key so the existing tier-gating stays consistent.
 */
export async function upsertSubscription(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = upsertSubscriptionSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { tenantId, planKey, amountTzs, currentPeriodEnd } = parsed.data;
  return withAdminAuth(async (ctx) => {
    const plan = await adminDb.plan.findUnique({ where: { key: planKey } });
    if (!plan) return err(`Plan "${planKey}" not found`);

    // Retire any currently-active subscription, then create the new one.
    await adminDb.subscription.updateMany({
      where: { tenantId, status: "active" },
      data: { status: "canceled", canceledAt: new Date() },
    });
    const created = await adminDb.subscription.create({
      data: {
        tenantId,
        planId: plan.id,
        status: "active",
        amountTzs,
        ...(currentPeriodEnd ? { currentPeriodEnd } : {}),
      },
    });
    await adminDb.tenant.update({ where: { id: tenantId }, data: { tier: planKey } });
    await writePlatformAudit(ctx, {
      action: "subscription.upsert",
      targetType: "Subscription",
      targetId: created.id,
      targetTenantId: tenantId,
      details: { planKey, amountTzs },
    });
    return ok({ id: created.id });
  });
}

export async function cancelSubscription(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = subscriptionIdSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { subscriptionId } = parsed.data;
  return withAdminAuth(async (ctx) => {
    const sub = await adminDb.subscription.findUnique({ where: { id: subscriptionId } });
    if (!sub) return err("Subscription not found");
    await adminDb.subscription.update({
      where: { id: subscriptionId },
      data: { status: "canceled", canceledAt: new Date() },
    });
    await writePlatformAudit(ctx, {
      action: "subscription.cancel",
      targetType: "Subscription",
      targetId: subscriptionId,
      targetTenantId: sub.tenantId,
    });
    return ok({ id: subscriptionId });
  });
}
