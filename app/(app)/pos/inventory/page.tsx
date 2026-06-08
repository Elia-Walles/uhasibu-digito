"use client";
import { useState, useMemo } from "react";
import { Plus, Boxes } from "lucide-react";
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
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatRowSkeleton } from "@/components/skeletons/StatRowSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { useInventory } from "@/lib/hooks/useInventory";
import type { InventoryItem, CostingMethod } from "@/types";

interface FormState {
  code: string;
  name: string;
  category: string;
  unit: string;
  onHand: number;
  reorderLevel: number;
  unitCost: number;
  sellingPrice: number;
}

function emptyForm(): FormState {
  return { code: "", name: "", category: "General", unit: "pcs", onHand: 0, reorderLevel: 10, unitCost: 0, sellingPrice: 0 };
}

export default function POSInventoryPage() {
  const { inventory, addItem, loading } = useInventory();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const filtered = useMemo(() => {
    if (!search) return inventory;
    const q = search.toLowerCase();
    return inventory.filter((i) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
  }, [inventory, search]);

  const stockValue = inventory.reduce((s, i) => s + i.totalValue, 0);
  const lowStock = inventory.filter((i) => i.status !== "InStock").length;

  async function save() {
    if (!form.name.trim()) {
      toast.error("Item name is required");
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
      location: "POS",
      supplier: "—",
      costingMethod: "WeightedAverage" as CostingMethod,
      status,
    };
    const res = await addItem(item);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Added ${res.data.name}`);
    setAddOpen(false);
    setForm(emptyForm());
  }

  const COLS: Column<InventoryItem>[] = [
    { key: "code", label: "SKU", className: "font-mono text-xs", sortable: true, width: "110px" },
    { key: "name", label: "Product", sortable: true, render: (r) => <div><div className="font-medium">{r.name}</div><div className="text-xs text-ud-text-muted">{r.category}</div></div> },
    { key: "onHand", label: "On hand", sortable: true, align: "right", render: (r) => <span className="font-mono font-medium">{r.onHand}</span> },
    { key: "unitCost", label: "Cost", align: "right", render: (r) => <CurrencyDisplay amount={r.unitCost} showSymbol={false} /> },
    { key: "sellingPrice", label: "Sell price", sortable: true, align: "right", render: (r) => <CurrencyDisplay amount={r.sellingPrice} showSymbol={false} /> },
    { key: "totalValue", label: "Value", sortable: true, align: "right", render: (r) => <CurrencyDisplay amount={r.totalValue} showSymbol={false} className="font-medium" /> },
    { key: "status", label: "Status", render: (r) => (
      <Badge variant={r.status === "InStock" ? "success" : r.status === "LowStock" ? "warning" : "danger"} pulse={r.status === "OutOfStock"}>
        {r.status === "InStock" ? "In stock" : r.status === "LowStock" ? "Low" : "Out"}
      </Badge>
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Inventory"
        subtitle="Products available at the point of sale"
        breadcrumbs={[{ label: "Point of Sale", href: "/pos" }, { label: "Inventory" }]}
        actions={<Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Add product</Button>}
      />

      {loading ? <StatRowSkeleton /> : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatCard label="Products" value={inventory.length} variant="teal" format="raw" />
          <StatCard label="Stock value" value={stockValue} variant="emerald" prefix="TSh" format="compact" />
          <StatCard label="Low / out of stock" value={lowStock} variant="amber" format="raw" />
        </div>
      )}

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by name or SKU…" />

      {loading ? (
        <TableSkeleton rows={10} columns={7} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No products yet"
          description="Add your first product so you can start ringing up sales on the Register."
          action={{ label: "Add product", onClick: () => setAddOpen(true), icon: <Plus className="w-4 h-4" /> }}
        />
      ) : (
        <DataTable data={filtered} columns={COLS} pageSize={15} initialSortKey="name" rowKey={(r) => r.id} />
      )}

      <Modal
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add product"
        description="Add a new product to sell at the point of sale."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => void save()}>Add product</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Input label="SKU (auto if blank)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <Input label="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <Select label="Unit" value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })} options={[
            { value: "pcs", label: "pcs" }, { value: "kg", label: "kg" }, { value: "L", label: "L" }, { value: "bag", label: "bag" }, { value: "box", label: "box" },
          ]} />
          <Input label="Opening on-hand" type="number" value={String(form.onHand)} onChange={(e) => setForm({ ...form, onHand: Number(e.target.value) || 0 })} />
          <Input label="Reorder level" type="number" value={String(form.reorderLevel)} onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) || 0 })} />
          <Input label="Unit cost (TZS)" type="number" value={String(form.unitCost)} onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) || 0 })} />
          <Input label="Selling price (TZS)" type="number" value={String(form.sellingPrice)} onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) || 0 })} />
        </div>
      </Modal>
    </PageWrapper>
  );
}
