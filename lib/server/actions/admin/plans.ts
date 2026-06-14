"use server";
import { adminDb } from "@/lib/server/admin-db";
import { withAdminAuth } from "@/lib/server/with-admin-auth";
import { writePlatformAudit } from "@/lib/server/admin-audit";
import { planSchema, updatePlanSchema, togglePlanSchema } from "@/lib/server/schemas/admin";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum } from "@/lib/server/serialize";
import type { AdminPlanRow } from "./types";

function parseFeatures(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function listPlans(): Promise<AdminPlanRow[]> {
  return withAdminAuth(async () => {
    const [plans, subGroups] = await Promise.all([
      adminDb.plan.findMany({ orderBy: { sortOrder: "asc" } }),
      adminDb.subscription.groupBy({ by: ["planId"], where: { status: "active" }, _count: { _all: true } }),
    ]);
    const countByPlan = new Map(subGroups.map((g) => [g.planId, g._count._all]));
    return plans.map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      tagline: p.tagline,
      priceTzs: decToNum(p.priceTzs),
      interval: p.interval,
      features: parseFeatures(p.features),
      isActive: p.isActive,
      highlighted: p.highlighted,
      sortOrder: p.sortOrder,
      subscriberCount: countByPlan.get(p.id) ?? 0,
    }));
  });
}

export async function createPlan(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  return withAdminAuth(async (ctx) => {
    const clash = await adminDb.plan.findUnique({ where: { key: d.key } });
    if (clash) return err(`A plan with key "${d.key}" already exists`);
    const created = await adminDb.plan.create({
      data: {
        key: d.key,
        name: d.name,
        tagline: d.tagline,
        priceTzs: d.priceTzs,
        interval: d.interval,
        features: JSON.stringify(d.features),
        isActive: d.isActive,
        highlighted: d.highlighted,
        sortOrder: d.sortOrder,
      },
    });
    await writePlatformAudit(ctx, { action: "plan.create", targetType: "Plan", targetId: created.id, details: d });
    return ok({ id: created.id });
  });
}

export async function updatePlan(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = updatePlanSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, features, ...rest } = parsed.data;
  return withAdminAuth(async (ctx) => {
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) if (v !== undefined) data[k] = v;
    if (features !== undefined) data.features = JSON.stringify(features);
    try {
      await adminDb.plan.update({ where: { id }, data });
    } catch {
      return err("Plan not found");
    }
    await writePlatformAudit(ctx, { action: "plan.update", targetType: "Plan", targetId: id, details: data });
    return ok({ id });
  });
}

export async function togglePlanActive(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = togglePlanSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, isActive } = parsed.data;
  return withAdminAuth(async (ctx) => {
    try {
      await adminDb.plan.update({ where: { id }, data: { isActive } });
    } catch {
      return err("Plan not found");
    }
    await writePlatformAudit(ctx, { action: "plan.toggle", targetType: "Plan", targetId: id, details: { isActive } });
    return ok({ id });
  });
}
