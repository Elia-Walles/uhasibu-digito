import type { db } from "./db";
import type { MovementType, StockStatus } from "@/types";

// The interactive-transaction client for the extended `db`.
type Tx = Omit<typeof db, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export interface StockMovementInput {
  itemId: string;
  type: MovementType;
  /** Magnitude for IN/OUT/TRANSFER; signed delta for ADJUSTMENT. */
  quantity: number;
  unitCost: number;
  narration?: string;
}

function statusFor(onHand: number, reorderLevel: number): StockStatus {
  if (onHand <= 0) return "OutOfStock";
  if (onHand < reorderLevel) return "LowStock";
  return "InStock";
}

/**
 * The compound stock write: in one transaction, record the StockMovement AND recompute
 * the item's onHand / totalValue / status. Sign is owned here (IN +, OUT −, ADJUSTMENT
 * signed, TRANSFER 0) — the correct convention (the legacy mock store mis-signed OUT).
 * Scoped by tenantId explicitly so it's correct in $transaction and unit-testable.
 * Returns null if the item doesn't belong to the tenant.
 */
export async function applyStockMovement(
  tx: Tx,
  tenantId: string,
  input: StockMovementInput,
): Promise<{ movementId: string; newOnHand: number } | null> {
  const item = await tx.inventoryItem.findFirst({ where: { id: input.itemId, tenantId } });
  if (!item) return null;

  const mag = Math.abs(input.quantity);
  const delta =
    input.type === "IN" ? mag : input.type === "OUT" ? -mag : input.type === "ADJUSTMENT" ? input.quantity : 0;
  const signedQty = input.type === "OUT" ? -mag : input.type === "ADJUSTMENT" ? input.quantity : mag;

  const onHand = Number(item.onHand);
  const unitCost = Number(item.unitCost);
  const newOnHand = Math.max(0, onHand + delta);
  const narration = input.narration || `${input.type} — ${item.name}`;

  const movement = await tx.stockMovement.create({
    data: {
      tenantId,
      itemId: item.id,
      date: new Date(),
      reference: `MOV-${Date.now().toString(36).toUpperCase()}`,
      itemName: item.name,
      itemCode: item.code,
      type: input.type,
      quantity: signedQty,
      unitCost: input.unitCost,
      totalValue: mag * input.unitCost,
      balanceAfter: newOnHand,
      narration,
    },
  });

  await tx.inventoryItem.update({
    where: { id: item.id },
    data: {
      onHand: newOnHand,
      totalValue: newOnHand * unitCost,
      status: statusFor(newOnHand, Number(item.reorderLevel)),
    },
  });

  return { movementId: movement.id, newOnHand };
}
