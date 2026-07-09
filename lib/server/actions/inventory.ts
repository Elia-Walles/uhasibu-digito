"use server";
import type { InventoryItem as DbItem, StockMovement as DbMovement } from "@prisma/client";
import { db } from "@/lib/server/db";
import { withAuth, branchScope } from "@/lib/server/with-auth";
import { isBranchRestricted } from "@/lib/auth/roles";
import { applyStockMovement, StockError } from "@/lib/server/stock-movement";
import { createItemSchema, updateItemSchema, deleteItemSchema, recordMovementSchema } from "@/lib/server/schemas/inventory";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum, dateOnly } from "@/lib/server/serialize";
import type { InventoryItem, StockMovement, BranchStock, CostingMethod, StockStatus, MovementType } from "@/types";

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
    branchId: r.branchId,
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

export async function updateInventoryItem(input: unknown): Promise<Result<InventoryItem>> {
  const parsed = updateItemSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, ...fields } = parsed.data;
  return withAuth(async () => {
    const item = await db.inventoryItem.findFirst({ where: { id } });
    if (!item) return err("Item not found");

    const onHand = decToNum(item.onHand);
    const reorderLevel = fields.reorderLevel ?? decToNum(item.reorderLevel);
    const unitCost = fields.unitCost ?? decToNum(item.unitCost);

    const data: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(fields)) if (v !== undefined) data[k] = v;
    data.status = statusFor(onHand, reorderLevel);
    data.totalValue = onHand * unitCost;

    const updated = await db.inventoryItem.update({ where: { id }, data });
    return ok(rowToItem(updated));
  });
}

export async function deleteInventoryItem(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = deleteItemSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id } = parsed.data;
  return withAuth(async () => {
    const item = await db.inventoryItem.findFirst({ where: { id } });
    if (!item) return err("Item not found");
    const [movements, saleLines] = await Promise.all([
      db.stockMovement.count({ where: { itemId: id } }),
      db.pOSSaleLine.count({ where: { itemId: id } }),
    ]);
    if (movements > 0 || saleLines > 0) {
      return err("This item has stock movements or sales history and can't be deleted. Zero its stock and stop using it instead.");
    }
    if (decToNum(item.onHand) > 0) return err("Set on-hand to zero before deleting this item.");
    await db.branchStock.deleteMany({ where: { itemId: id } });
    await db.inventoryItem.delete({ where: { id } });
    return ok({ id });
  });
}

export async function listBranchStock(itemId?: string): Promise<BranchStock[]> {
  return withAuth(async (ctx) => {
    // Branch-restricted staff only see their own branch's per-branch stock.
    const scope = branchScope(ctx);
    const rows = await db.branchStock.findMany({
      where: { ...(itemId ? { itemId } : {}), ...(scope ? { branchId: scope } : {}) },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => ({ id: r.id, branchId: r.branchId, itemId: r.itemId, onHand: decToNum(r.onHand) }));
  });
}

export async function recordStockMovement(input: unknown): Promise<Result<{ itemId: string; newOnHand: number }>> {
  const parsed = recordMovementSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  return withAuth(async (ctx) => {
    // Branch-restricted staff can only move their own branch's stock.
    const scope = branchScope(ctx);
    if (isBranchRestricted(ctx.role) && !scope) return err("Your account isn't assigned to a branch. Ask an administrator.");
    const branchId = scope ?? d.branchId;
    try {
      const result = await db.$transaction((tx) =>
        applyStockMovement(tx, ctx.tenantId, {
          itemId: d.itemId,
          type: d.type,
          quantity: d.quantity,
          unitCost: d.unitCost,
          narration: d.narration,
          ...(branchId ? { branchId } : {}),
          enforceStock: d.type === "OUT",
        }),
      );
      if (!result) return err("Item not found");
      return ok({ itemId: d.itemId, newOnHand: result.newOnHand });
    } catch (e) {
      if (e instanceof StockError) return err(e.message);
      throw e;
    }
  });
}
