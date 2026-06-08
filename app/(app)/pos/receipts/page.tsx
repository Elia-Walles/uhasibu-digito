"use client";
import { useState, useMemo } from "react";
import { FileText } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { usePOSSales } from "@/lib/hooks/usePOS";
import { formatDateTime } from "@/lib/utils/dates";
import type { POSSale, PaymentMethod } from "@/types";

const PAYMENT_BADGE: Record<PaymentMethod, "teal" | "info" | "gold"> = {
  mpesa: "teal",
  cash: "info",
  card: "gold",
};

export default function POSReceiptsPage() {
  const { sales, loading } = usePOSSales({});
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<POSSale | null>(null);

  const filtered = useMemo(() => {
    if (!search) return sales;
    const q = search.toLowerCase();
    return sales.filter(
      (s) => s.receiptNumber.toLowerCase().includes(q) || s.efdNumber.toLowerCase().includes(q) || s.customerName.toLowerCase().includes(q),
    );
  }, [sales, search]);

  const COLS: Column<POSSale>[] = [
    { key: "receiptNumber", label: "Receipt", sortable: true, className: "font-mono text-xs", width: "130px" },
    { key: "efdNumber", label: "EFD #", className: "font-mono text-xs text-ud-text-muted" },
    { key: "soldAt", label: "Issued", sortable: true, accessor: (r) => r.soldAt, render: (r) => <span className="text-ud-text-secondary">{formatDateTime(r.soldAt)}</span> },
    { key: "customerName", label: "Customer", render: (r) => <span className="truncate">{r.customerName}</span> },
    { key: "paymentMethod", label: "Method", render: (r) => <Badge variant={PAYMENT_BADGE[r.paymentMethod]} size="sm">{r.paymentMethod.toUpperCase()}</Badge> },
    { key: "total", label: "Total", sortable: true, align: "right", accessor: (r) => r.total, render: (r) => <CurrencyDisplay amount={r.total} showSymbol={false} className="font-medium" /> },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Receipts"
        subtitle="EFD receipts issued at the point of sale — tap a row to view or reprint"
        breadcrumbs={[{ label: "Point of Sale", href: "/pos" }, { label: "Receipts" }]}
      />

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by receipt, EFD or customer…" />

      {loading ? (
        <TableSkeleton rows={10} columns={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No receipts yet"
          description="Receipts appear here once you complete a sale on the Register."
        />
      ) : (
        <DataTable
          data={filtered}
          columns={COLS}
          pageSize={15}
          initialSortKey="soldAt"
          initialSortDir="desc"
          rowKey={(r) => r.id}
          onRowClick={(r) => setActive(r)}
        />
      )}

      <ReceiptModal sale={active} onClose={() => setActive(null)} />
    </PageWrapper>
  );
}
