"use client";
import { ArrowUp, ArrowDown, ArrowLeftRight, Settings2 } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { useLoadingSimulation } from "@/lib/hooks/useLoadingSimulation";
import { STOCK_MOVEMENTS } from "@/lib/mock-data/inventory";
import { formatDate } from "@/lib/utils/dates";
import { formatAmount } from "@/lib/utils/currency";
import type { StockMovement, MovementType } from "@/types";

const TYPE_META: Record<MovementType, { color: "success" | "danger" | "info" | "warning"; icon: typeof ArrowUp; label: string }> = {
  IN:         { color: "success", icon: ArrowDown,       label: "Stock In" },
  OUT:        { color: "danger",  icon: ArrowUp,         label: "Stock Out" },
  TRANSFER:   { color: "info",    icon: ArrowLeftRight,  label: "Transfer" },
  ADJUSTMENT: { color: "warning", icon: Settings2,       label: "Adjustment" },
};

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

export default function StockMovementsPage() {
  const loading = useLoadingSimulation(800);
  return (
    <PageWrapper>
      <PageHeader
        title="Stock Movements"
        subtitle={`${STOCK_MOVEMENTS.length} movements · October 2024`}
        breadcrumbs={[{ label: "Inventory", href: "/inventory" }, { label: "Movements" }]}
      />
      {loading ? <TableSkeleton rows={10} columns={7} /> :
        <DataTable data={STOCK_MOVEMENTS} columns={COLS} pageSize={15} initialSortKey="date" initialSortDir="desc" rowKey={(r) => r.id} />
      }
    </PageWrapper>
  );
}
