"use server";
import type { FixedAsset as DbAsset } from "@prisma/client";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import { applyAssetDisposal } from "@/lib/server/asset-disposal";
import { postAssetAcquisition, postDepreciation } from "@/lib/server/gl-postings";
import { createAssetSchema, disposeAssetSchema, runDepreciationSchema } from "@/lib/server/schemas/fixed-assets";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum, dateOnly } from "@/lib/server/serialize";
import type { FixedAsset, AssetCategory, DepreciationMethod, AssetStatus } from "@/types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function rowToAsset(r: DbAsset): FixedAsset {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    category: r.category as AssetCategory,
    location: r.location,
    acquisitionDate: dateOnly(r.acquisitionDate),
    cost: decToNum(r.cost),
    residualValue: decToNum(r.residualValue),
    usefulLifeYears: r.usefulLifeYears,
    depreciationMethod: r.depreciationMethod as DepreciationMethod,
    accumulatedDepreciation: decToNum(r.accumulatedDepreciation),
    netBookValue: decToNum(r.netBookValue),
    status: r.status as AssetStatus,
    ...(r.disposalDate ? { disposalDate: dateOnly(r.disposalDate) } : {}),
    ...(r.disposalProceeds !== null ? { disposalProceeds: decToNum(r.disposalProceeds) } : {}),
    ...(r.gainLoss !== null ? { gainLoss: decToNum(r.gainLoss) } : {}),
  };
}

export async function listAssets(): Promise<FixedAsset[]> {
  return withAuth(async () => {
    const rows = await db.fixedAsset.findMany({ orderBy: { code: "asc" } });
    return rows.map(rowToAsset);
  });
}

export async function createAsset(input: unknown): Promise<Result<FixedAsset>> {
  const parsed = createAssetSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  const code = d.code || `${d.category.slice(0, 3).toUpperCase()}-${String(Date.now()).slice(-4)}`;
  return withAuth(async (ctx) => {
    const clash = await db.fixedAsset.findFirst({ where: { code } });
    if (clash) return err(`Asset code ${code} already exists`);
    const created = await db.$transaction(async (tx) => {
      const asset = await tx.fixedAsset.create({
        data: {
          tenantId: ctx.tenantId,
          code,
          name: d.name,
          category: d.category,
          location: d.location,
          acquisitionDate: new Date(d.acquisitionDate),
          cost: d.cost,
          residualValue: d.residualValue,
          usefulLifeYears: d.usefulLifeYears,
          depreciationMethod: d.depreciationMethod,
          accumulatedDepreciation: 0,
          netBookValue: d.cost,
          status: "Active",
        },
      });
      // Capitalise the asset: Dr PP&E, Cr cash/bank or payables.
      await postAssetAcquisition(tx, ctx.tenantId, ctx, {
        code,
        name: d.name,
        date: dateOnly(new Date(d.acquisitionDate)),
        cost: d.cost,
        paymentMethod: d.paymentMethod,
      });
      return asset;
    });
    return ok(rowToAsset(created));
  });
}

/**
 * Runs one month of depreciation for all active assets (straight-line on the depreciable base,
 * capped so accumulated depreciation never exceeds cost − residual), updates each asset's
 * accumulated depreciation / NBV / status, and posts a single Dr Depreciation, Cr Accumulated
 * Depreciation journal for the total. Idempotent per period via the unique DEP-<period> reference.
 */
export async function runDepreciation(input: unknown): Promise<Result<{ period: string; amount: number; assets: number }>> {
  const parsed = runDepreciationSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { period } = parsed.data;
  return withAuth(async (ctx) => {
    const already = await db.journalEntryGroup.findFirst({ where: { reference: `DEP-${period}` } });
    if (already) return err(`Depreciation for ${period} has already been posted`);

    const assets = await db.fixedAsset.findMany({ where: { status: "Active" } });
    const updates: { id: string; newAcc: number; newNbv: number; fully: boolean }[] = [];
    let totalDep = 0;
    for (const a of assets) {
      const cost = decToNum(a.cost);
      const residual = decToNum(a.residualValue);
      const acc = decToNum(a.accumulatedDepreciation);
      const life = a.usefulLifeYears;
      if (life <= 0) continue;
      const base = cost - residual;
      const monthly = base / (life * 12);
      const remaining = Math.max(0, base - acc);
      const dep = round2(Math.min(monthly, remaining));
      if (dep <= 0) continue;
      const newAcc = round2(acc + dep);
      const newNbv = round2(cost - newAcc);
      updates.push({ id: a.id, newAcc, newNbv, fully: newNbv <= residual + 0.01 });
      totalDep += dep;
    }
    if (updates.length === 0) return err("No active assets to depreciate for this period");
    totalDep = round2(totalDep);

    const [y, m] = period.split("-").map(Number) as [number, number];
    const depDate = dateOnly(new Date(y, m, 0)); // last day of the period month

    await db.$transaction(async (tx) => {
      for (const u of updates) {
        await tx.fixedAsset.update({
          where: { id: u.id },
          data: {
            accumulatedDepreciation: u.newAcc,
            netBookValue: u.newNbv,
            ...(u.fully ? { status: "Fully Depreciated" } : {}),
          },
        });
      }
      await postDepreciation(tx, ctx.tenantId, ctx, { period, date: depDate, amount: totalDep });
    });
    return ok({ period, amount: totalDep, assets: updates.length });
  });
}

export async function disposeAsset(input: unknown): Promise<Result<{ id: string; gainLoss: number }>> {
  const parsed = disposeAssetSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, proceeds, date } = parsed.data;
  return withAuth(async (ctx) => {
    const result = await db.$transaction((tx) => applyAssetDisposal(tx, ctx.tenantId, ctx, { assetId: id, proceeds, date }));
    if (!result) return err("Asset not found");
    return ok({ id, gainLoss: result.gainLoss });
  });
}
