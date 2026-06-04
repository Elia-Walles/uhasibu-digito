"use client";
import { useState } from "react";
import { Plus, ArrowUp, ArrowDown, ArrowLeftRight, Settings2 } from "lucide-react";
import toast from "react-hot-toast";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { useLoadingSimulation } from "@/lib/hooks/useLoadingSimulation";
import { useDataStore } from "@/lib/store/dataStore";
import { formatDate } from "@/lib/utils/dates";
import { formatAmount } from "@/lib/utils/currency";
import type { StockMovement, MovementType } from "@/types";

const TYPE_META: Record<MovementType, { color: "success" | "danger" | "info" | "warning"; icon: typeof ArrowUp; label: string }> = {
  IN:         { color: "success", icon: ArrowDown,       label: "Stock In" },
  OUT:        { color: "danger",  icon: ArrowUp,         label: "Stock Out" },
  TRANSFER:   { color: "info",    icon: ArrowLeftRight,  label: "Transfer" },
  ADJUSTMENT: { color: "warning", icon: Settings2,       label: "Adjustment" },
};

interface FormState {
  itemId: string;
  type: MovementType;
  quantity: number;
  unitCost: number;
  narration: string;
}

function emptyForm(): FormState {
  return { itemId: "", type: "IN", quantity: 0, unitCost: 0, narration: "" };
}

export default function StockMovementsPage() {
  const loading = useLoadingSimulation(800);
  const stockMovements = useDataStore((s) => s.stockMovements);
  const inventory = useDataStore((s) => s.inventory);
  const recordStockMovement = useDataStore((s) => s.recordStockMovement);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const itemOptions = inventory.map((i) => ({ value: i.id, label: `${i.code} — ${i.name}` }));
  const selectedItem = inventory.find((i) => i.id === form.itemId);

  function openAdd() {
    const f = emptyForm();
    if (itemOptions[0]) {
      f.itemId = itemOptions[0].value;
      const item = inventory.find((i) => i.id === f.itemId);
      f.unitCost = item?.unitCost ?? 0;
    }
    setForm(f);
    setAddOpen(true);
  }

  function save() {
    if (!form.itemId || form.quantity <= 0) {
      toast.error("Pick an item and enter a quantity");
      return;
    }
    const item = inventory.find((i) => i.id === form.itemId);
    if (!item) return;
    const stamp = Date.now();
    const signedQty = form.type === "OUT" ? -form.quantity : form.quantity;
    const newBalance = form.type === "OUT" ? item.onHand - form.quantity
                     : form.type === "IN"  ? item.onHand + form.quantity
                     : form.type === "ADJUSTMENT" ? item.onHand + form.quantity
                     : item.onHand;
    const movement: StockMovement = {
      id: `mov_${stamp}`,
      date: new Date().toISOString().split("T")[0]!,
      reference: `MOV-${String(stamp).slice(-6)}`,
      itemId: item.id,
      itemName: item.name,
      itemCode: item.code,
      type: form.type,
      quantity: signedQty,
      unitCost: form.unitCost,
      totalValue: form.quantity * form.unitCost,
      balanceAfter: Math.max(0, newBalance),
      narration: form.narration || `${TYPE_META[form.type].label} — ${item.name}`,
    };
    recordStockMovement(movement);
    toast.success(`${TYPE_META[form.type].label} recorded`);
    setAddOpen(false);
    setForm(emptyForm());
  }

  const COLS: Column<StockMovement>[] = [
    { key: "date", label: "Date", sortable: true, render: (r) => formatDate(r.date), width: "100px" },
    { key: "reference", label: "Reference", className: "font-mono text-xs" },
    { key: "itemName", label: "Item", render: (r) => <div><div className="text-sm font-medium">{r.itemName}</div><div className="text-xs text-ud-text-muted">{r.itemCode}</div></div> },
    { key: "type", label: "Type", render: (r) => {
      const m = TYPE_META[r.type];
      const Icon = m.icon;
      return <Badge variant={m.color}><Icon className="w-2.5 h-2.5" />{m.label}</Badge>;
    } },
    { key: "quantity", label: "Qty", sortable: true, align: "right", render: (r) => <span className={`font-mono font-medium ${r.quantity > 0 ? "text-ud-success" : "text-ud-danger"}`}>{r.quantity > 0 ? "+" : ""}{r.quantity}</span> },
    { key: "totalValue", label: "Value", align: "right", render: (r) => <span className="font-mono">{formatAmount(r.totalValue)}</span> },
    { key: "narration", label: "Narration", render: (r) => <span className="text-ud-text-secondary text-xs">{r.narration}</span> },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Stock Movements"
        subtitle={`${stockMovements.length} movements recorded`}
        breadcrumbs={[{ label: "Inventory", href: "/inventory" }, { label: "Movements" }]}
        actions={<Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openAdd}>Record movement</Button>}
      />
      {loading ? <TableSkeleton rows={10} columns={7} /> :
        <DataTable data={stockMovements} columns={COLS} pageSize={15} initialSortKey="date" initialSortDir="desc" rowKey={(r) => r.id} />
      }

      <Modal
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Record stock movement"
        description="Record an IN / OUT / Transfer / Adjustment. The item's on-hand is updated automatically."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={save}>Record</Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <Select label="Item" value={form.itemId} onValueChange={(v) => {
            const it = inventory.find((i) => i.id === v);
            setForm({ ...form, itemId: v, unitCost: it?.unitCost ?? form.unitCost });
          }} options={itemOptions} />

          <div className="grid grid-cols-2 gap-2">
            {(["IN", "OUT", "TRANSFER", "ADJUSTMENT"] as MovementType[]).map((t) => {
              const m = TYPE_META[t];
              const Icon = m.icon;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  className={`p-3 rounded-xl border text-sm font-medium min-h-[56px] transition-all inline-flex items-center gap-2 ${
                    form.type === t ? "border-ud-primary bg-ud-primary-50 text-ud-primary" : "border-ud-border hover:border-ud-primary/40"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {m.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Quantity" type="number" value={String(form.quantity)} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) || 0 })} />
            <Input label="Unit cost (TZS)" type="number" value={String(form.unitCost)} onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) || 0 })} />
          </div>
          <Input label="Narration" value={form.narration} onChange={(e) => setForm({ ...form, narration: e.target.value })} placeholder="Reason / reference" />

          {selectedItem && (
            <div className="p-3 rounded-xl bg-ud-surface-2 text-xs text-ud-text-secondary">
              Current on-hand: <span className="font-mono font-bold">{selectedItem.onHand}</span> {selectedItem.unit}
              {form.quantity > 0 && (
                <> · After this movement: <span className="font-mono font-bold text-ud-primary">
                  {form.type === "OUT"
                    ? Math.max(0, selectedItem.onHand - form.quantity)
                    : form.type === "ADJUSTMENT"
                      ? Math.max(0, selectedItem.onHand + form.quantity)
                      : selectedItem.onHand + form.quantity}
                </span> {selectedItem.unit}</>
              )}
            </div>
          )}
        </div>
      </Modal>
    </PageWrapper>
  );
}
