"use client";
import { Check, X } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { useLoadingSimulation } from "@/lib/hooks/useLoadingSimulation";
import { PURCHASE_ORDERS } from "@/lib/mock-data/suppliers";
import { formatDate } from "@/lib/utils/dates";
import type { PurchaseOrder } from "@/types";

function MatchDot({ ok }: { ok: boolean }) {
  return ok ? <Check className="w-3 h-3 text-ud-success" /> : <X className="w-3 h-3 text-ud-text-faint" />;
}

const COLS: Column<PurchaseOrder>[] = [
  { key: "number",       label: "PO #",      sortable: true, className: "font-mono text-xs" },
  { key: "supplierName", label: "Supplier",  sortable: true, render: (r) => <span className="font-medium">{r.supplierName}</span> },
  { key: "date",         label: "Date",      sortable: true, render: (r) => formatDate(r.date) },
  { key: "expectedDelivery", label: "Delivery", render: (r) => formatDate(r.expectedDelivery) },
  { key: "total",        label: "Total",     sortable: true, align: "right", render: (r) => <CurrencyDisplay amount={r.total} showSymbol={false} className="font-medium" /> },
  { key: "matchStatus",  label: "3-way match", render: (r) => (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1 text-xs"><MatchDot ok={r.matchStatus.poConfirmed} />PO</span>
      <span className="inline-flex items-center gap-1 text-xs"><MatchDot ok={r.matchStatus.grnReceived} />GRN</span>
      <span className="inline-flex items-center gap-1 text-xs"><MatchDot ok={r.matchStatus.invoiceReceived} />INV</span>
    </div>
  ) },
  { key: "status", label: "Status", render: (r) => (
    <Badge variant={r.status === "Received" ? "success" : r.status === "Sent" ? "info" : r.status === "Draft" ? "warning" : "default"}>{r.status}</Badge>
  ) },
];

export default function PurchaseOrdersPage() {
  const loading = useLoadingSimulation(800);
  return (
    <PageWrapper>
      <PageHeader
        title="Purchase Orders"
        subtitle={`${PURCHASE_ORDERS.length} POs · 3-way matched against GRN and supplier invoices`}
        breadcrumbs={[{ label: "Procurement", href: "/procurement" }, { label: "Purchase Orders" }]}
      />
      {loading ? <TableSkeleton rows={10} columns={7} /> :
        <DataTable data={PURCHASE_ORDERS} columns={COLS} pageSize={15} initialSortKey="date" initialSortDir="desc" rowKey={(r) => r.id} />
      }
    </PageWrapper>
  );
}
