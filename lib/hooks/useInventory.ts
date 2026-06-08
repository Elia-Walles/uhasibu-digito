"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listInventory,
  listStockMovements,
  createInventoryItem,
  recordStockMovement as recordAction,
} from "@/lib/server/actions/inventory";
import { type Result } from "@/lib/server/result";
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
  refresh: () => Promise<void>;
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
  const [serverInventory, setServerInventory] = useState<InventoryItem[]>([]);
  const [serverMovements, setServerMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
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

  return {
    inventory: serverInventory,
    stockMovements: serverMovements,
    loading,
    refresh,
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
