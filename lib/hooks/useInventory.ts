"use client";
import { useCallback, useEffect, useState } from "react";
import { INVENTORY_BACKEND_ENABLED } from "@/lib/flags";
import { useDataStore } from "@/lib/store/dataStore";
import {
  listInventory,
  listStockMovements,
  createInventoryItem,
  recordStockMovement as recordAction,
} from "@/lib/server/actions/inventory";
import { ok, type Result } from "@/lib/server/result";
import type { InventoryItem, StockMovement, MovementType } from "@/types";

export interface RecordMovementInput {
  itemId: string;
  type: MovementType;
  /** Magnitude for IN/OUT/TRANSFER; signed delta for ADJUSTMENT. */
  quantity: number;
  unitCost: number;
  narration?: string;
}

export interface UseInventory {
  inventory: InventoryItem[];
  stockMovements: StockMovement[];
  loading: boolean;
  addItem: (item: InventoryItem) => Promise<Result<InventoryItem>>;
  recordMovement: (input: RecordMovementInput) => Promise<Result<{ itemId: string; newOnHand: number }>>;
}

function toCreateInput(item: InventoryItem) {
  return {
    code: item.code,
    name: item.name,
    category: item.category,
    unit: item.unit,
    onHand: item.onHand,
    reorderLevel: item.reorderLevel,
    unitCost: item.unitCost,
    sellingPrice: item.sellingPrice,
    location: item.location,
    supplier: item.supplier,
    costingMethod: item.costingMethod,
  };
}

export function useInventory(): UseInventory {
  const mockInventory = useDataStore((s) => s.inventory);
  const mockMovements = useDataStore((s) => s.stockMovements);
  const mockAddItem = useDataStore((s) => s.addInventoryItem);
  const mockRecord = useDataStore((s) => s.recordStockMovement);

  const [serverInventory, setServerInventory] = useState<InventoryItem[]>([]);
  const [serverMovements, setServerMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(INVENTORY_BACKEND_ENABLED);

  const refresh = useCallback(async () => {
    if (!INVENTORY_BACKEND_ENABLED) return;
    setLoading(true);
    try {
      const [inv, mv] = await Promise.all([listInventory(), listStockMovements()]);
      setServerInventory(inv);
      setServerMovements(mv);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  if (!INVENTORY_BACKEND_ENABLED) {
    return {
      inventory: mockInventory,
      stockMovements: mockMovements,
      loading: false,
      addItem: async (item) => {
        mockAddItem(item);
        return ok(item);
      },
      recordMovement: async (input) => {
        const item = mockInventory.find((i) => i.id === input.itemId);
        const mag = Math.abs(input.quantity);
        const signedQty = input.type === "OUT" ? -mag : input.type === "ADJUSTMENT" ? input.quantity : mag;
        const delta =
          input.type === "IN" ? mag : input.type === "OUT" ? -mag : input.type === "ADJUSTMENT" ? input.quantity : 0;
        const newOnHand = Math.max(0, (item?.onHand ?? 0) + delta);
        const stamp = Date.now();
        const mv: StockMovement = {
          id: `mov_${stamp}`,
          date: new Date().toISOString().split("T")[0]!,
          reference: `MOV-${String(stamp).slice(-6)}`,
          itemId: input.itemId,
          itemName: item?.name ?? "",
          itemCode: item?.code ?? "",
          type: input.type,
          quantity: signedQty,
          unitCost: input.unitCost,
          totalValue: mag * input.unitCost,
          balanceAfter: newOnHand,
          narration: input.narration || `${input.type} — ${item?.name ?? ""}`,
        };
        mockRecord(mv);
        return ok({ itemId: input.itemId, newOnHand });
      },
    };
  }

  return {
    inventory: serverInventory,
    stockMovements: serverMovements,
    loading,
    addItem: async (item) => {
      const r = await createInventoryItem(toCreateInput(item));
      if (r.ok) await refresh();
      return r;
    },
    recordMovement: async (input) => {
      const r = await recordAction(input);
      if (r.ok) await refresh();
      return r;
    },
  };
}
