"use client";
import { useState, useMemo } from "react";
import { Plus, Grid3x3, List, Pencil, Trash2, ArrowLeftRight } from "lucide-react";
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
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StockAdjustModal } from "@/components/inventory/StockAdjustModal";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { useInventory } from "@/lib/hooks/useInventory";
import { useBranches } from "@/lib/hooks/useBranches";
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

function formFrom(item: InventoryItem): FormState {
  return {
    code: item.code, name: item.name, category: item.category, unit: item.unit,
    onHand: item.onHand, reorderLevel: item.reorderLevel, unitCost: item.unitCost,
    sellingPrice: item.sellingPrice, location: item.location, supplier: item.supplier,
    costingMethod: item.costingMethod,
  };
}

export default function InventoryItemsPage() {
  const t = useT();
  const { inventory, branchStock, addItem, updateItem, deleteItem, recordMovement, loading } = useInventory();
  const { branches } = useBranches();
  const [view, setView] = useState<"grid" | "list">("list");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  const branchName = useMemo(() => new Map(branches.map((b) => [b.id, b.name])), [branches]);
  const stockByItem = useMemo(() => {
    const map = new Map<string, { branchId: string; onHand: number }[]>();
    for (const bs of branchStock) {
      const list = map.get(bs.itemId) ?? [];
      list.push({ branchId: bs.branchId, onHand: bs.onHand });
      map.set(bs.itemId, list);
    }
    return map;
  }, [branchStock]);

  const categories = useMemo(() => Array.from(new Set(inventory.map((i) => i.category))).sort(), [inventory]);
  const locations  = useMemo(() => Array.from(new Set(inventory.map((i) => i.location))).sort(), [inventory]);

  const filtered = useMemo(() => {
    if (!search) return inventory;
    const q = search.toLowerCase();
    return inventory.filter((i) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
  }, [inventory, search]);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  }
  function openEdit(item: InventoryItem) {
    setEditingId(item.id);
    setForm(formFrom(item));
    setFormOpen(true);
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error(t("Item name is required"));
      return;
    }
    if (editingId) {
      const res = await updateItem({
        ...inventory.find((i) => i.id === editingId)!,
        name: form.name.trim(),
        category: form.category,
        unit: form.unit,
        reorderLevel: form.reorderLevel,
        unitCost: form.unitCost,
        sellingPrice: form.sellingPrice,
        location: form.location,
        supplier: form.supplier,
        costingMethod: form.costingMethod,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("Saved {name}", { name: res.data.name }));
    } else {
      const code = form.code.trim() || `SKU-${String(Date.now()).slice(-6)}`;
      const status = form.onHand === 0 ? "OutOfStock" : form.onHand < form.reorderLevel ? "LowStock" : "InStock";
      const item: InventoryItem = {
        id: `item_${Date.now()}`, code, name: form.name.trim(), category: form.category, unit: form.unit,
        onHand: form.onHand, reorderLevel: form.reorderLevel, unitCost: form.unitCost, sellingPrice: form.sellingPrice,
        totalValue: form.onHand * form.unitCost, location: form.location, supplier: form.supplier,
        costingMethod: form.costingMethod, status,
      };
      const res = await addItem(item);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("Added {name}", { name: res.data.name }));
    }
    setFormOpen(false);
    setForm(emptyForm());
    setEditingId(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const res = await deleteItem(deleteTarget.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t("Deleted {name}", { name: deleteTarget.name }));
    setDeleteTarget(null);
  }

  function renderBranchStock(item: InventoryItem) {
    const rows = stockByItem.get(item.id);
    if (!rows || rows.length === 0) return <span className="text-ud-text-faint">—</span>;
    return (
      <div className="flex flex-wrap gap-1 justify-end">
        {rows.map((r) => (
          <span key={r.branchId} className="inline-flex items-center gap-1 rounded-md bg-ud-surface-2 px-1.5 py-0.5 text-[11px] font-mono">
            {branchName.get(r.branchId) ?? "?"}: {r.onHand}
          </span>
        ))}
      </div>
    );
  }

  const COLS: Column<InventoryItem>[] = [
    { key: "code", label: "SKU", className: "font-mono text-xs", sortable: true, width: "100px" },
    { key: "name", label: "Item", sortable: true,
      render: (r) => <div><div className="font-medium">{r.name}</div><div className="text-xs text-ud-text-muted">{r.category}</div></div> },
    { key: "onHand",       label: "On hand",    sortable: true, align: "right", render: (r) => <span className="font-mono font-medium">{r.onHand}</span> },
    { key: "branches",     label: "By branch",  align: "right", render: (r) => renderBranchStock(r) },
    { key: "sellingPrice", label: "Sell price", sortable: true, align: "right", render: (r) => <CurrencyDisplay amount={r.sellingPrice} showSymbol={false} /> },
    { key: "totalValue",   label: "Value",      sortable: true, align: "right", render: (r) => <CurrencyDisplay amount={r.totalValue}   showSymbol={false} className="font-medium" /> },
    { key: "status", label: "Status", render: (r) => (
      <Badge variant={r.status === "InStock" ? "success" : r.status === "LowStock" ? "warning" : "danger"} pulse={r.status === "OutOfStock"}>
        {r.status === "InStock" ? t("In stock") : r.status === "LowStock" ? t("Low") : t("Out")}
      </Badge>
    ) },
    { key: "actions", label: "", width: "120px", render: (r) => (
      <div className="flex items-center justify-end gap-1">
        <RowAction label={t("Adjust stock")} onClick={() => setAdjusting(r)}><ArrowLeftRight className="w-4 h-4" /></RowAction>
        <RowAction label={t("Edit")} onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></RowAction>
        <RowAction label={t("Delete")} danger onClick={() => setDeleteTarget(r)}><Trash2 className="w-4 h-4" /></RowAction>
      </div>
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
            <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openAdd}>{t("Add item")}</Button>
          </>
        }
      />

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by name or SKU…" />

      {loading ? (
        view === "list" ? <TableSkeleton rows={10} columns={9} /> : <CardGridSkeleton count={9} cols={3} />
      ) : view === "list" ? (
        <DataTable data={filtered} columns={COLS} pageSize={15} initialSortKey="name" rowKey={(r) => r.id} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((i) => (
            <div key={i.id} className="group bg-white border border-ud-border rounded-2xl p-4 hover:border-ud-primary hover:shadow-card-hover transition-all">
              <div className="aspect-square rounded-xl bg-ud-primary-50 flex items-center justify-center mb-3 text-3xl">📦</div>
              <div className="font-medium text-sm truncate">{i.name}</div>
              <div className="text-xs text-ud-text-muted">{i.code}</div>
              <div className="mt-2 flex items-center justify-between">
                <CurrencyDisplay amount={i.sellingPrice} compact className="font-bold text-sm" />
                <Badge variant={i.status === "InStock" ? "success" : i.status === "LowStock" ? "warning" : "danger"} size="sm">
                  {i.onHand}
                </Badge>
              </div>
              <div className="mt-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <RowAction label={t("Adjust stock")} onClick={() => setAdjusting(i)}><ArrowLeftRight className="w-4 h-4" /></RowAction>
                <RowAction label={t("Edit")} onClick={() => openEdit(i)}><Pencil className="w-4 h-4" /></RowAction>
                <RowAction label={t("Delete")} danger onClick={() => setDeleteTarget(i)}><Trash2 className="w-4 h-4" /></RowAction>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingId ? "Edit item" : "Add item"}
        description={editingId ? "Update this SKU. Stock levels change via Adjust stock." : "Add a new SKU to the inventory register."}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>{t("Cancel")}</Button>
            <Button variant="primary" onClick={() => void save()}>{editingId ? t("Save changes") : t("Add item")}</Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="SKU (auto if blank)" value={form.code} disabled={!!editingId} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <Input label="Item name"           value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Category"            value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <Select label="Unit"               value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })} options={[
              { value: "pcs",   label: "pcs" }, { value: "kg",   label: "kg" }, { value: "L", label: "L" }, { value: "bag", label: "bag" }, { value: "box", label: "box" },
            ]} />
            {!editingId && (
              <Input label="Opening on-hand" type="number" value={String(form.onHand)} onChange={(e) => setForm({ ...form, onHand: Number(e.target.value) || 0 })} />
            )}
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

      <StockAdjustModal item={adjusting} branches={branches} onClose={() => setAdjusting(null)} recordMovement={recordMovement} />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t("Delete item?")}
        message={t("Delete “{name}”? Items with stock movements or sales history can't be deleted.", { name: deleteTarget?.name ?? "" })}
        confirmLabel={t("Delete")}
        onConfirm={() => void confirmDelete()}
      />
    </PageWrapper>
  );
}

function RowAction({ label, danger, onClick, children }: { label: string; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label={label}
      title={label}
      className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center text-ud-text-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-primary",
        danger ? "hover:bg-ud-danger/10 hover:text-ud-danger" : "hover:bg-ud-primary-50 hover:text-ud-primary",
      )}
    >
      {children}
    </button>
  );
}
