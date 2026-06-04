"use server";
import type { FixedAsset as DbAsset } from "@prisma/client";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import { applyAssetDisposal } from "@/lib/server/asset-disposal";
import { createAssetSchema, disposeAssetSchema } from "@/lib/server/schemas/fixed-assets";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum, dateOnly } from "@/lib/server/serialize";
import type { FixedAsset, AssetCategory, DepreciationMethod, AssetStatus } from "@/types";

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
    const created = await db.fixedAsset.create({
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
    return ok(rowToAsset(created));
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
