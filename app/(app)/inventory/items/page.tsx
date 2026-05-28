"use client";
import { useState, useMemo } from "react";
import { Plus, Grid3x3, List } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { FilterBar } from "@/components/ui/FilterBar";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { useLoadingSimulation } from "@/lib/hooks/useLoadingSimulation";
import { INVENTORY } from "@/lib/mock-data/inventory";
import type { InventoryItem } from "@/types";
import { cn } from "@/lib/utils/cn";

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
      {r.status === "InStock" ? "In stock" : r.status === "LowStock" ? "Low" : "Out"}
    </Badge>
  ) },
];

export default function InventoryItemsPage() {
  const loading = useLoadingSimulation(800);
  const [view, setView] = useState<"grid" | "list">("list");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return INVENTORY;
    const q = search.toLowerCase();
    return INVENTORY.filter((i) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
  }, [search]);

  return (
    <PageWrapper>
      <PageHeader
        title="Items"
        subtitle={`${filtered.length} items`}
        breadcrumbs={[{ label: "Inventory", href: "/inventory" }, { label: "Items" }]}
        actions={
          <>
            <div className="flex gap-1 bg-ud-surface-2 p-1 rounded-xl">
              <button onClick={() => setView("list")} className={cn("p-1.5 rounded-lg", view === "list" ? "bg-white shadow-sm" : "text-ud-text-muted")} aria-label="List view">
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => setView("grid")} className={cn("p-1.5 rounded-lg", view === "grid" ? "bg-white shadow-sm" : "text-ud-text-muted")} aria-label="Grid view">
                <Grid3x3 className="w-4 h-4" />
              </button>
            </div>
            <Button variant="primary" icon={<Plus className="w-4 h-4" />}>Add item</Button>
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
    </PageWrapper>
  );
}
