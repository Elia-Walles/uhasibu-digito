"use server";
import { adminDb } from "@/lib/server/admin-db";
import { withAdminAuth } from "@/lib/server/with-admin-auth";
import { writePlatformAudit } from "@/lib/server/admin-audit";
import {
  createTenantSchema,
  updateTenantSchema,
  setTenantTierSchema,
  tenantIdSchema,
} from "@/lib/server/schemas/admin";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum, iso } from "@/lib/server/serialize";
import { normalizeTier } from "@/lib/auth/tiers";
import { monthlyAmount } from "./_shared";
import type { AdminTenantRow, AdminTenantDetail } from "./types";

export async function listTenants(): Promise<AdminTenantRow[]> {
  return withAdminAuth(async () => {
    const tenants = await adminDb.tenant.findMany({ orderBy: { createdAt: "desc" } });
    const [userGroups, activeSubs] = await Promise.all([
      adminDb.user.groupBy({ by: ["tenantId"], _count: { _all: true } }),
      adminDb.subscription.findMany({ where: { status: "active" }, include: { plan: true } }),
    ]);
    const userCountByTenant = new Map<string, number>();
    for (const g of userGroups) if (g.tenantId) userCountByTenant.set(g.tenantId, g._count._all);
    const subByTenant = new Map(activeSubs.map((s) => [s.tenantId, s]));

    return tenants.map((t) => {
      const sub = subByTenant.get(t.id);
      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        tier: normalizeTier(t.tier),
        userCount: userCountByTenant.get(t.id) ?? 0,
        subscriptionStatus: sub?.status ?? null,
        mrrTzs: sub ? monthlyAmount(sub.amountTzs, sub.plan.interval) : 0,
        createdAt: iso(t.createdAt),
      };
    });
  });
}

export async function getTenant(input: unknown): Promise<Result<AdminTenantDetail>> {
  const parsed = tenantIdSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { tenantId } = parsed.data;
  return withAdminAuth(async () => {
    const tenant = await adminDb.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return err("Tenant not found");
    const [userCount, profile, sub, payAgg] = await Promise.all([
      adminDb.user.count({ where: { tenantId } }),
      adminDb.companyProfile.findFirst({ where: { tenantId } }),
      adminDb.subscription.findFirst({ where: { tenantId, status: "active" }, include: { plan: true } }),
      adminDb.payment.aggregate({ where: { tenantId, status: "recorded" }, _sum: { amountTzs: true } }),
    ]);
    return ok({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      tier: normalizeTier(tenant.tier),
      userCount,
      subscriptionStatus: sub?.status ?? null,
      mrrTzs: sub ? monthlyAmount(sub.amountTzs, sub.plan.interval) : 0,
      createdAt: iso(tenant.createdAt),
      companyName: profile?.name ?? null,
      tin: profile?.tin ?? null,
      email: profile?.email ?? null,
      phone: profile?.phone ?? null,
      region: profile?.region ?? null,
      totalPaidTzs: payAgg._sum.amountTzs ? decToNum(payAgg._sum.amountTzs) : 0,
    });
  });
}

export async function createTenant(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = createTenantSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { name, slug, tier } = parsed.data;
  return withAdminAuth(async (ctx) => {
    const clash = await adminDb.tenant.findUnique({ where: { slug } });
    if (clash) return err(`Slug "${slug}" is already taken`);
    const created = await adminDb.tenant.create({ data: { name, slug, tier } });
    await writePlatformAudit(ctx, {
      action: "tenant.create",
      targetType: "Tenant",
      targetId: created.id,
      targetTenantId: created.id,
      details: { name, slug, tier },
    });
    return ok({ id: created.id });
  });
}

export async function updateTenant(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = updateTenantSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { tenantId, name, slug } = parsed.data;
  return withAdminAuth(async (ctx) => {
    if (slug) {
      const clash = await adminDb.tenant.findUnique({ where: { slug } });
      if (clash && clash.id !== tenantId) return err(`Slug "${slug}" is already taken`);
    }
    const data: { name?: string; slug?: string } = {};
    if (name !== undefined) data.name = name;
    if (slug !== undefined) data.slug = slug;
    try {
      await adminDb.tenant.update({ where: { id: tenantId }, data });
    } catch {
      return err("Tenant not found");
    }
    await writePlatformAudit(ctx, {
      action: "tenant.update",
      targetType: "Tenant",
      targetId: tenantId,
      targetTenantId: tenantId,
      details: data,
    });
    return ok({ id: tenantId });
  });
}

export async function setTenantTier(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = setTenantTierSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { tenantId, tier } = parsed.data;
  return withAdminAuth(async (ctx) => {
    const before = await adminDb.tenant.findUnique({ where: { id: tenantId }, select: { tier: true } });
    if (!before) return err("Tenant not found");
    await adminDb.tenant.update({ where: { id: tenantId }, data: { tier } });
    await writePlatformAudit(ctx, {
      action: "tenant.tier.change",
      targetType: "Tenant",
      targetId: tenantId,
      targetTenantId: tenantId,
      details: { from: before.tier, to: tier },
    });
    return ok({ id: tenantId });
  });
}

/**
 * Hard-delete a tenant and every row scoped to it (children before parents), mirroring
 * the seed's wipeTenant ordering. Destructive only reachable by a super-admin.
 */
export async function deleteTenant(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = tenantIdSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { tenantId } = parsed.data;
  return withAdminAuth(async (ctx) => {
    const tenant = await adminDb.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return err("Tenant not found");
    const where = { where: { tenantId } };

    // Platform-level records for this tenant.
    await adminDb.payment.deleteMany(where);
    await adminDb.subscription.deleteMany(where);
    // Children / line tables.
    await adminDb.document.deleteMany(where);
    await adminDb.invoiceLine.deleteMany(where);
    await adminDb.quotationLine.deleteMany(where);
    await adminDb.pOLine.deleteMany(where);
    await adminDb.pOSSaleLine.deleteMany(where);
    await adminDb.vATTransaction.deleteMany(where);
    await adminDb.bankTransaction.deleteMany(where);
    await adminDb.gLEntry.deleteMany(where);
    await adminDb.stockMovement.deleteMany(where);
    await adminDb.payrollRunEmployee.deleteMany(where);
    await adminDb.employeeAllowance.deleteMany(where);
    await adminDb.sendLogEntry.deleteMany(where);
    await adminDb.auditStepResult.deleteMany(where);
    // Parents.
    await adminDb.invoice.deleteMany(where);
    await adminDb.quotation.deleteMany(where);
    await adminDb.purchaseOrder.deleteMany(where);
    await adminDb.pOSSale.deleteMany(where);
    await adminDb.vATReturn.deleteMany(where);
    await adminDb.journalEntryGroup.deleteMany(where);
    await adminDb.bankAccount.deleteMany(where);
    await adminDb.inventoryItem.deleteMany(where);
    await adminDb.payrollRun.deleteMany(where);
    await adminDb.employee.deleteMany(where);
    await adminDb.taxFiling.deleteMany(where);
    await adminDb.fixedAsset.deleteMany(where);
    await adminDb.budgetLine.deleteMany(where);
    await adminDb.auditEngagement.deleteMany(where);
    await adminDb.lead.deleteMany(where);
    await adminDb.pipelineDeal.deleteMany(where);
    await adminDb.supplier.deleteMany(where);
    await adminDb.customer.deleteMany(where);
    await adminDb.branch.deleteMany(where);
    await adminDb.cOAAccount.deleteMany(where);
    await adminDb.auditLog.deleteMany(where);
    await adminDb.companyProfile.deleteMany(where);
    // Users reference Department users before departments.
    await adminDb.user.deleteMany(where);
    await adminDb.department.deleteMany(where);
    await adminDb.membership.deleteMany(where);
    await adminDb.tenant.delete({ where: { id: tenantId } });

    await writePlatformAudit(ctx, {
      action: "tenant.delete",
      targetType: "Tenant",
      targetId: tenantId,
      targetTenantId: tenantId,
      details: { name: tenant.name, slug: tenant.slug },
    });
    return ok({ id: tenantId });
  });
}
