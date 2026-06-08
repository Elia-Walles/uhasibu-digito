"use client";
import { Plus, X, AlertTriangle } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { formatTZS } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import type { InventoryItem } from "@/types";

export interface EditorLine {
  itemId: string;
  quantity: number;
  unitPrice: number;
}

export function newLine(): EditorLine {
  return { itemId: "", quantity: 1, unitPrice: 0 };
}

/** Stock check for one line. Returns an error string, or null when the line is fine. */
export function lineStockError(line: EditorLine, inventory: InventoryItem[]): string | null {
  if (!line.itemId) return null;
  const item = inventory.find((i) => i.id === line.itemId);
  if (!item) return "Product not found";
  if (line.quantity > item.onHand) {
    return `Only ${item.onHand} in stock — adjust the stock first`;
  }
  return null;
}

/** True when every line is valid (has a product, qty > 0, and within stock). */
export function linesValid(lines: EditorLine[], inventory: InventoryItem[]): boolean {
  return (
    lines.length > 0 &&
    lines.every((l) => l.itemId && l.quantity > 0 && lineStockError(l, inventory) === null)
  );
}

export function linesTotal(lines: EditorLine[]): number {
  return lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
}

interface SaleLineEditorProps {
  inventory: InventoryItem[];
  lines: EditorLine[];
  onChange: (lines: EditorLine[]) => void;
}

export function SaleLineEditor({ inventory, lines, onChange }: SaleLineEditorProps) {
  const options = inventory.map((i) => ({ value: i.id, label: `${i.name} (stock: ${i.onHand})` }));

  function update(idx: number, patch: Partial<EditorLine>) {
    onChange(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function selectItem(idx: number, itemId: string) {
    const item = inventory.find((i) => i.id === itemId);
    update(idx, { itemId, unitPrice: item ? item.sellingPrice : 0 });
  }

  return (
    <div className="space-y-3">
      {lines.map((line, idx) => {
        const error = lineStockError(line, inventory);
        return (
          <div key={idx} className="rounded-xl border border-ud-border p-3">
            <div className="flex flex-col sm:flex-row sm:items-end gap-2">
              <div className="flex-1 min-w-0">
                <Select
                  {...(idx === 0 ? { label: "Product" } : {})}
                  value={line.itemId}
                  onValueChange={(v) => selectItem(idx, v)}
                  placeholder="Select product"
                  options={options}
                />
              </div>
              <div className="w-full sm:w-20">
                <label className="block text-xs font-medium text-ud-text-secondary mb-1.5 sm:hidden">Qty</label>
                {idx === 0 && <label className="hidden sm:block text-xs font-medium text-ud-text-secondary mb-1.5">Qty</label>}
                <input
                  type="number"
                  min={1}
                  value={String(line.quantity)}
                  onChange={(e) => update(idx, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                  className="w-full px-3 py-2 rounded-xl border border-ud-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ud-primary"
                  aria-label="Quantity"
                />
              </div>
              <div className="w-full sm:w-32">
                <label className="block text-xs font-medium text-ud-text-secondary mb-1.5 sm:hidden">Unit price</label>
                {idx === 0 && <label className="hidden sm:block text-xs font-medium text-ud-text-secondary mb-1.5">Unit price</label>}
                <input
                  type="number"
                  min={0}
                  value={String(line.unitPrice)}
                  onChange={(e) => update(idx, { unitPrice: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-full px-3 py-2 rounded-xl border border-ud-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ud-primary"
                  aria-label="Unit price"
                />
              </div>
              <div className="w-full sm:w-28 sm:text-right">
                <label className="block text-xs font-medium text-ud-text-secondary mb-1.5 sm:hidden">Line total</label>
                {idx === 0 && <div className="hidden sm:block text-xs font-medium text-ud-text-secondary mb-1.5">Line total</div>}
                <div className="px-1 py-2 text-sm font-mono font-medium tabular-nums">{formatTZS(line.quantity * line.unitPrice)}</div>
              </div>
              <button
                type="button"
                onClick={() => onChange(lines.filter((_, i) => i !== idx))}
                disabled={lines.length === 1}
                className="self-start sm:self-auto mb-1 w-8 h-8 rounded-lg flex items-center justify-center text-ud-text-muted hover:bg-ud-danger/10 hover:text-ud-danger disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Remove line"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {error && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-ud-danger">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onChange([...lines, newLine()])}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ud-primary hover:text-ud-primary-hover"
      >
        <Plus className="w-4 h-4" /> Add item
      </button>
    </div>
  );
}
