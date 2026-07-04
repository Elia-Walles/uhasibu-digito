import type { db } from "./db";
import type { MovementType, StockStatus } from "@/types";

// The interactive-transaction client for the extended `db`.
type Tx = Omit<typeof db, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/** Thrown when `enforceStock` is set and a movement would drive stock negative. Callers
 *  translate it into a friendly `Result` error instead of a 500. */
export class StockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockError";
  }
}

export interface StockMovementInput {
  itemId: string;
  type: MovementType;
  /** Magnitude for IN/OUT/TRANSFER; signed delta for ADJUSTMENT. */
  quantity: number;
  unitCost: number;
  narration?: string;
  /** Attribute the movement to a branch and adjust that branch's on-hand. */
  branchId?: string;
  /** Reject (throw StockError) instead of clamping when the result would be negative. */
  enforceStock?: boolean;
}

function statusFor(onHand: number, reorderLevel: number): StockStatus {
  if (onHand <= 0) return "OutOfStock";
  if (onHand < reorderLevel) return "LowStock";
  return "InStock";
}

/**
 * The compound stock write: in one transaction, record the StockMovement AND recompute the
 * item's onHand / unitCost / totalValue / status. Sign is owned here (IN +, OUT −, ADJUSTMENT
 * signed, TRANSFER 0).
 *
 * Per-branch: `InventoryItem.onHand` is always the global total. When `branchId` is given,
 * the matching `BranchStock` row is adjusted too — it is authoritative where it already
 * exists, and is created on stock-IN (allocating stock to that branch). Items never allocated
 * to a branch stay global-only, so branch-less tenants behave exactly as before.
 *
 * Costing: on IN with `WeightedAverage`, the item's unitCost is re-averaged with the incoming
 * cost. `enforceStock` makes an oversell throw `StockError` rather than silently clamp to 0.
 *
 * Scoped by tenantId explicitly so it's correct inside $transaction and unit-testable. Returns
 * null if the item doesn't belong to the tenant.
 */
export async function applyStockMovement(
  tx: Tx,
  tenantId: string,
  input: StockMovementInput,
): Promise<{ movementId: string; newOnHand: number; branchOnHand: number | null } | null> {
  const item = await tx.inventoryItem.findFirst({ where: { id: input.itemId, tenantId } });
  if (!item) return null;

  const mag = Math.abs(input.quantity);
  const delta =
    input.type === "IN" ? mag : input.type === "OUT" ? -mag : input.type === "ADJUSTMENT" ? input.quantity : 0;
  const signedQty = input.type === "OUT" ? -mag : input.type === "ADJUSTMENT" ? input.quantity : mag;

  const onHand = Number(item.onHand);
  const oldCost = Number(item.unitCost);

  // Weighted-average cost recompute when new stock arrives at a (possibly different) cost.
  let unitCost = oldCost;
  if (input.type === "IN" && item.costingMethod === "WeightedAverage" && onHand + mag > 0) {
    unitCost = (onHand * oldCost + mag * input.unitCost) / (onHand + mag);
  }

  const globalNew = onHand + delta;
  if (input.enforceStock && globalNew < 0) {
    throw new StockError(`Not enough stock for "${item.name}": ${onHand} available.`);
  }
  const newOnHand = Math.max(0, globalNew);

  // Per-branch bucket (authoritative where a row exists; created on IN).
  let branchBalanceAfter: number | null = null;
  if (input.branchId) {
    const bs = await tx.branchStock.findFirst({ where: { branchId: input.branchId, itemId: item.id } });
    if (bs) {
      const branchNew = Number(bs.onHand) + delta;
      if (input.enforceStock && branchNew < 0) {
        throw new StockError(`Not enough stock for "${item.name}" at this branch: ${Number(bs.onHand)} available.`);
      }
      const branchFinal = Math.max(0, branchNew);
      await tx.branchStock.update({ where: { id: bs.id }, data: { onHand: branchFinal } });
      branchBalanceAfter = branchFinal;
    } else if (input.type === "IN") {
      await tx.branchStock.create({ data: { tenantId, branchId: input.branchId, itemId: item.id, onHand: mag } });
      branchBalanceAfter = mag;
    }
  }

  const narration = input.narration || `${input.type} ${item.name}`;
  const movement = await tx.stockMovement.create({
    data: {
      tenantId,
      itemId: item.id,
      ...(input.branchId ? { branchId: input.branchId } : {}),
      date: new Date(),
      reference: `MOV-${Date.now().toString(36).toUpperCase()}`,
      itemName: item.name,
      itemCode: item.code,
      type: input.type,
      quantity: signedQty,
      unitCost: input.unitCost,
      totalValue: mag * input.unitCost,
      balanceAfter: branchBalanceAfter ?? newOnHand,
      narration,
    },
  });

  await tx.inventoryItem.update({
    where: { id: item.id },
    data: {
      onHand: newOnHand,
      unitCost,
      totalValue: newOnHand * unitCost,
      status: statusFor(newOnHand, Number(item.reorderLevel)),
    },
  });

  return { movementId: movement.id, newOnHand, branchOnHand: branchBalanceAfter };
}
