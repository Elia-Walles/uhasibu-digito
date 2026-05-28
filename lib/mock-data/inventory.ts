import type { InventoryItem, StockMovement } from "@/types";
import {
  rngFromSeed,
  pick,
  range,
  randomInt,
  isoDate,
  INVENTORY_CATEGORIES,
  INVENTORY_ITEMS_BY_CATEGORY,
} from "./generators";

const rnd = rngFromSeed(7777);

const LOCATIONS = ["DSM-Main","DSM-Annex","Mwanza","Zanzibar","Arusha"];
const SUPPLIERS = ["Kariakoo Wholesale Ltd","Tanzania Foods Co","East Africa Supplies","Pwani Distributors","Highland Imports"];

export const INVENTORY: InventoryItem[] = (() => {
  const items: InventoryItem[] = [];
  let seq = 1;
  for (const category of INVENTORY_CATEGORIES) {
    const names = INVENTORY_ITEMS_BY_CATEGORY[category] ?? [];
    for (const name of names) {
      const unitCost  = randomInt(500, 80000, rnd);
      const margin    = 1.2 + rnd() * 0.6;
      const sellPrice = Math.round((unitCost * margin) / 100) * 100;
      const reorder   = randomInt(10, 50, rnd);
      const onHand    = randomInt(0, reorder * 4, rnd);
      const status =
        onHand === 0 ? "OutOfStock" :
        onHand < reorder ? "LowStock" : "InStock";
      items.push({
        id: `inv_${String(seq).padStart(3, "0")}`,
        code: `SKU-${String(seq).padStart(4, "0")}`,
        name,
        category,
        unit: category === "Services" ? "Hours" :
              category === "Food & Beverages" ? "Each" : "Each",
        onHand,
        reorderLevel: reorder,
        unitCost,
        sellingPrice: sellPrice,
        totalValue: onHand * unitCost,
        location: pick(LOCATIONS, rnd),
        supplier: pick(SUPPLIERS, rnd),
        costingMethod: "WeightedAverage",
        status,
      });
      seq++;
    }
  }
  return items;
})();

// 60 recent movements
const TYPE_BUCKETS = ["IN","IN","IN","OUT","OUT","OUT","OUT","TRANSFER","ADJUSTMENT"] as const;

export const STOCK_MOVEMENTS: StockMovement[] = range(60, (i) => {
  const item = INVENTORY[randomInt(0, INVENTORY.length - 1, rnd)]!;
  const type = pick(TYPE_BUCKETS, rnd);
  const qty  = randomInt(1, 50, rnd);
  const date = new Date(2024, 9, randomInt(1, 28, rnd));
  return {
    id: `mvt_${String(i + 1).padStart(3, "0")}`,
    date: isoDate(date),
    reference: `MV-2024-${String(i + 1).padStart(5, "0")}`,
    itemId: item.id,
    itemName: item.name,
    itemCode: item.code,
    type,
    quantity: type === "OUT" ? -qty : qty,
    unitCost: item.unitCost,
    totalValue: (type === "OUT" ? -qty : qty) * item.unitCost,
    balanceAfter: item.onHand + (type === "OUT" ? -qty : qty),
    narration:
      type === "IN" ? "Stock received from supplier" :
      type === "OUT" ? "Sales fulfillment" :
      type === "TRANSFER" ? "Transfer between locations" :
      "Stock adjustment after count",
  };
});
