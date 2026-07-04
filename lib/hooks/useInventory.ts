"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listInventory,
  listStockMovements,
  listBranchStock,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  recordStockMovement as recordAction,
} from "@/lib/server/actions/inventory";
import { type Result } from "@/lib/server/result";
import type { InventoryItem, StockMovement, BranchStock, MovementType } from "@/types";

export interface RecordMovementInput {
  itemId: string;
  branchId?: string;
  type: MovementType;
  /** Magnitude for IN/OUT/TRANSFER; signed delta for ADJUSTMENT. */
  quantity: number;
  unitCost: number;
  narration?: string;
}

export interface UseInventory {
  inventory: InventoryItem[];
  stockMovements: StockMovement[];
  branchStock: BranchStock[];
  loading: boolean;
  refresh: () => Promise<void>;
  addItem: (item: InventoryItem) => Promise<Result<InventoryItem>>;
  updateItem: (item: InventoryItem) => Promise<Result<InventoryItem>>;
  deleteItem: (id: string) => Promise<Result<{ id: string }>>;
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

function toUpdateInput(item: InventoryItem) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    unit: item.unit,
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
  const [serverBranchStock, setServerBranchStock] = useState<BranchStock[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, mv, bs] = await Promise.all([listInventory(), listStockMovements(), listBranchStock()]);
      setServerInventory(inv);
      setServerMovements(mv);
      setServerBranchStock(bs);
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
    branchStock: serverBranchStock,
    loading,
    refresh,
    addItem: async (item) => {
      const r = await createInventoryItem(toCreateInput(item));
      if (r.ok) await refresh();
      return r;
    },
    updateItem: async (item) => {
      const r = await updateInventoryItem(toUpdateInput(item));
      if (r.ok) await refresh();
      return r;
    },
    deleteItem: async (id) => {
      const r = await deleteInventoryItem({ id });
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
