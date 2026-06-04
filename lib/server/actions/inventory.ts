"use server";
import type { InventoryItem as DbItem, StockMovement as DbMovement } from "@prisma/client";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import { applyStockMovement } from "@/lib/server/stock-movement";
import { createItemSchema, recordMovementSchema } from "@/lib/server/schemas/inventory";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum, dateOnly } from "@/lib/server/serialize";
import type { InventoryItem, StockMovement, CostingMethod, StockStatus, MovementType } from "@/types";

function statusFor(onHand: number, reorderLevel: number): StockStatus {
  if (onHand <= 0) return "OutOfStock";
  if (onHand < reorderLevel) return "LowStock";
  return "InStock";
}

function rowToItem(r: DbItem): InventoryItem {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    category: r.category,
    unit: r.unit,
    onHand: decToNum(r.onHand),
    reorderLevel: decToNum(r.reorderLevel),
    unitCost: decToNum(r.unitCost),
    sellingPrice: decToNum(r.sellingPrice),
    totalValue: decToNum(r.totalValue),
    location: r.location,
    supplier: r.supplier,
    costingMethod: r.costingMethod as CostingMethod,
    status: r.status as StockStatus,
  };
}

function rowToMovement(r: DbMovement): StockMovement {
  return {
    id: r.id,
    date: dateOnly(r.date),
    reference: r.reference,
    itemId: r.itemId,
    itemName: r.itemName,
    itemCode: r.itemCode,
    type: r.type as MovementType,
    quantity: decToNum(r.quantity),
    unitCost: decToNum(r.unitCost),
    totalValue: decToNum(r.totalValue),
    balanceAfter: decToNum(r.balanceAfter),
    narration: r.narration,
  };
}

export async function listInventory(): Promise<InventoryItem[]> {
  return withAuth(async () => {
    const rows = await db.inventoryItem.findMany({ orderBy: { code: "asc" } });
    return rows.map(rowToItem);
  });
}

export async function listStockMovements(): Promise<StockMovement[]> {
  return withAuth(async () => {
    const rows = await db.stockMovement.findMany({ orderBy: [{ date: "desc" }, { createdAt: "desc" }] });
    return rows.map(rowToMovement);
  });
}

export async function createInventoryItem(input: unknown): Promise<Result<InventoryItem>> {
  const parsed = createItemSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  const code = d.code || `SKU-${Date.now().toString(36).toUpperCase()}`;
  return withAuth(async (ctx) => {
    const clash = await db.inventoryItem.findFirst({ where: { code } });
    if (clash) return err(`Item code ${code} already exists`);
    const created = await db.inventoryItem.create({
      data: {
        tenantId: ctx.tenantId,
        code,
        name: d.name,
        category: d.category,
        unit: d.unit,
        onHand: d.onHand,
        reorderLevel: d.reorderLevel,
        unitCost: d.unitCost,
        sellingPrice: d.sellingPrice,
        totalValue: d.onHand * d.unitCost,
        location: d.location,
        supplier: d.supplier,
        costingMethod: d.costingMethod,
        status: statusFor(d.onHand, d.reorderLevel),
      },
    });
    return ok(rowToItem(created));
  });
}

export async function recordStockMovement(input: unknown): Promise<Result<{ itemId: string; newOnHand: number }>> {
  const parsed = recordMovementSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  return withAuth(async (ctx) => {
    const result = await db.$transaction((tx) => applyStockMovement(tx, ctx.tenantId, d));
    if (!result) return err("Item not found");
    return ok({ itemId: d.itemId, newOnHand: result.newOnHand });
  });
}
