"use client";
import { useState, useMemo } from "react";
import { Plus, Grid3x3, List } from "lucide-react";
import toast from "react-hot-toast";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { FilterBar } from "@/components/ui/FilterBar";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { useInventory } from "@/lib/hooks/useInventory";
import { useT } from "@/lib/hooks/useT";
import type { InventoryItem, CostingMethod } from "@/types";
import { cn } from "@/lib/utils/cn";

interface FormState {
  code: string;
  name: string;
  category: string;
  unit: string;
  onHand: number;
  reorderLevel: number;
  unitCost: number;
  sellingPrice: number;
  location: string;
  supplier: string;
  costingMethod: CostingMethod;
}

function emptyForm(): FormState {
  return {
    code: "", name: "", category: "General", unit: "pcs",
    onHand: 0, reorderLevel: 10, unitCost: 0, sellingPrice: 0,
    location: "DSM-Main", supplier: "", costingMethod: "FIFO",
  };
}

export default function InventoryItemsPage() {
  const t = useT();
  const { inventory, addItem, loading: invLoading } = useInventory();
  const loading = invLoading;
  const [view, setView] = useState<"grid" | "list">("list");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const categories = useMemo(() => Array.from(new Set(inventory.map((i) => i.category))).sort(), [inventory]);
  const locations  = useMemo(() => Array.from(new Set(inventory.map((i) => i.location))).sort(), [inventory]);

  const filtered = useMemo(() => {
    if (!search) return inventory;
    const q = search.toLowerCase();
    return inventory.filter((i) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
  }, [inventory, search]);

  async function save() {
    if (!form.name.trim()) {
      toast.error(t("Item name is required"));
      return;
    }
    const code = form.code.trim() || `SKU-${String(Date.now()).slice(-6)}`;
    const status = form.onHand === 0 ? "OutOfStock" : form.onHand < form.reorderLevel ? "LowStock" : "InStock";
    const item: InventoryItem = {
      id: `item_${Date.now()}`,
      code,
      name: form.name.trim(),
      category: form.category,
      unit: form.unit,
      onHand: form.onHand,
      reorderLevel: form.reorderLevel,
      unitCost: form.unitCost,
      sellingPrice: form.sellingPrice,
      totalValue: form.onHand * form.unitCost,
      location: form.location,
      supplier: form.supplier,
      costingMethod: form.costingMethod,
      status,
    };
    const res = await addItem(item);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t("Added {name}", { name: res.data.name }));
    setAddOpen(false);
    setForm(emptyForm());
  }

  const COLS: Column<InventoryItem>[] = [
    { key: "code", label: "SKU", className: "font-mono text-xs", sortable: true, width: "100px" },
    { key: "name", label: "Item", sortable: true,
      render: (r) => <div><div className="font-medium">{r.name}</div><div className="text-xs text-ud-text-muted">{r.category}</div></div> },
    { key: "location", label: "Location", render: (r) => <Badge variant="default" size="sm">{r.location}</Badge> },
    { key: "onHand",       label: "On hand",    sortable: true, align: "right", render: (r) => <span className="font-mono font-medium">{r.onHand}</span> },
    { key: "reorderLevel", label: "Reorder at", align: "right", render: (r) => <span className="font-mono text-ud-text-muted">{r.reorderLevel}</span> },
    { key: "sellingPrice", label: "Sell price", sortable: true, align: "right", render: (r) => <CurrencyDisplay amount={r.sellingPrice} showSymbol={false} /> },
    { key: "totalValue",   label: "Value",      sortable: true, align: "right", render: (r) => <CurrencyDisplay amount={r.totalValue}   showSymbol={false} className="font-medium" /> },
    { key: "status", label: "Status", render: (r) => (
      <Badge variant={r.status === "InStock" ? "success" : r.status === "LowStock" ? "warning" : "danger"} pulse={r.status === "OutOfStock"}>
        {r.status === "InStock" ? t("In stock") : r.status === "LowStock" ? t("Low") : t("Out")}
      </Badge>
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Items"
        subtitle={t("{n} items", { n: filtered.length })}
        breadcrumbs={[{ label: "Inventory", href: "/inventory" }, { label: "Items" }]}
        actions={
          <>
            <div className="flex gap-1 bg-ud-surface-2 p-1 rounded-xl">
              <button onClick={() => setView("list")} className={cn("p-1.5 rounded-lg", view === "list" ? "bg-white shadow-sm" : "text-ud-text-muted")} aria-label={t("List view")}>
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => setView("grid")} className={cn("p-1.5 rounded-lg", view === "grid" ? "bg-white shadow-sm" : "text-ud-text-muted")} aria-label={t("Grid view")}>
                <Grid3x3 className="w-4 h-4" />
              </button>
            </div>
            <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>{t("Add item")}</Button>
          </>
        }
      />

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by name or SKU…" />

      {loading ? (
        view === "list" ? <TableSkeleton rows={10} columns={8} /> : <CardGridSkeleton count={9} cols={3} />
      ) : view === "list" ? (
        <DataTable data={filtered} columns={COLS} pageSize={15} initialSortKey="name" rowKey={(r) => r.id} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((i) => (
            <div key={i.id} className="bg-white border border-ud-border rounded-2xl p-4 hover:border-ud-primary hover:shadow-card-hover transition-all">
              <div className="aspect-square rounded-xl bg-ud-primary-50 flex items-center justify-center mb-3 text-3xl">📦</div>
              <div className="font-medium text-sm truncate">{i.name}</div>
              <div className="text-xs text-ud-text-muted">{i.code}</div>
              <div className="mt-2 flex items-center justify-between">
                <CurrencyDisplay amount={i.sellingPrice} compact className="font-bold text-sm" />
                <Badge variant={i.status === "InStock" ? "success" : i.status === "LowStock" ? "warning" : "danger"} size="sm">
                  {i.onHand}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add item"
        description="Add a new SKU to the inventory register."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>{t("Cancel")}</Button>
            <Button variant="primary" onClick={() => void save()}>{t("Add item")}</Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="SKU (auto if blank)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <Input label="Item name"           value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Category"            value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <Select label="Unit"               value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })} options={[
              { value: "pcs",   label: "pcs" }, { value: "kg",   label: "kg" }, { value: "L", label: "L" }, { value: "bag", label: "bag" }, { value: "box", label: "box" },
            ]} />
            <Input label="Opening on-hand"     type="number" value={String(form.onHand)} onChange={(e) => setForm({ ...form, onHand: Number(e.target.value) || 0 })} />
            <Input label="Reorder level"       type="number" value={String(form.reorderLevel)} onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) || 0 })} />
            <Input label="Unit cost (TZS)"     type="number" value={String(form.unitCost)} onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) || 0 })} />
            <Input label="Selling price (TZS)" type="number" value={String(form.sellingPrice)} onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) || 0 })} />
            <Select label="Location" value={form.location} onValueChange={(v) => setForm({ ...form, location: v })} options={
              locations.map((l) => ({ value: l, label: l })).concat({ value: "DSM-Main", label: "DSM-Main" })
            } />
            <Input label="Supplier"  value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            <Select label="Costing method" value={form.costingMethod} onValueChange={(v) => setForm({ ...form, costingMethod: v as CostingMethod })} options={[
              { value: "FIFO", label: "FIFO" }, { value: "LIFO", label: "LIFO" }, { value: "WeightedAverage", label: "Weighted Average" },
            ]} />
          </div>
          <div className="text-xs text-ud-text-muted">
            {categories.length > 0 && <>{t("Existing categories:")} {categories.join(" · ")}</>}
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
