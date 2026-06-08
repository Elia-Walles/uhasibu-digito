"use client";
import { useState, useMemo } from "react";
import { Receipt as ReceiptIcon } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatRowSkeleton } from "@/components/skeletons/StatRowSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { useBranches } from "@/lib/hooks/useBranches";
import { usePOSSales, type POSFilter } from "@/lib/hooks/usePOS";
import { formatDateTime } from "@/lib/utils/dates";
import type { POSSale, PaymentMethod } from "@/types";

const PAYMENT_BADGE: Record<PaymentMethod, "teal" | "info" | "gold"> = {
  mpesa: "teal",
  cash: "info",
  card: "gold",
};

export default function POSSalesPage() {
  const { branches } = useBranches();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [branchId, setBranchId] = useState("all");
  const [method, setMethod] = useState("all");
  const [active, setActive] = useState<POSSale | null>(null);

  const filter = useMemo<POSFilter>(
    () => ({
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      ...(branchId !== "all" ? { branchId } : {}),
      ...(method !== "all" ? { paymentMethod: method as PaymentMethod } : {}),
    }),
    [from, to, branchId, method],
  );
  const { sales, loading } = usePOSSales(filter);

  const totalSales = sales.reduce((s, x) => s + x.total, 0);
  const grossProfit = sales.reduce((s, x) => s + x.grossProfit, 0);
  const avgBasket = sales.length > 0 ? totalSales / sales.length : 0;

  const COLS: Column<POSSale>[] = [
    { key: "receiptNumber", label: "Receipt", sortable: true, className: "font-mono text-xs", width: "130px" },
    { key: "soldAt", label: "Date & time", sortable: true, accessor: (r) => r.soldAt, render: (r) => <span className="text-ud-text-secondary">{formatDateTime(r.soldAt)}</span> },
    { key: "branchName", label: "Branch", render: (r) => <Badge variant="default" size="sm">{r.branchName || "—"}</Badge> },
    { key: "customerName", label: "Customer", render: (r) => <span className="truncate">{r.customerName}</span> },
    { key: "paymentMethod", label: "Method", render: (r) => <Badge variant={PAYMENT_BADGE[r.paymentMethod]} size="sm">{r.paymentMethod.toUpperCase()}</Badge> },
    { key: "grossProfit", label: "Profit", sortable: true, align: "right", accessor: (r) => r.grossProfit, render: (r) => <CurrencyDisplay amount={r.grossProfit} showSymbol={false} colored /> },
    { key: "total", label: "Total", sortable: true, align: "right", accessor: (r) => r.total, render: (r) => <CurrencyDisplay amount={r.total} showSymbol={false} className="font-medium" /> },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Sales Records"
        subtitle="Every point-of-sale transaction, filtered by date and branch"
        breadcrumbs={[{ label: "Point of Sale", href: "/pos" }, { label: "Sales Records" }]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5 p-4 bg-white border border-ud-border rounded-2xl shadow-card">
        <div>
          <label className="block text-xs font-medium text-ud-text-secondary mb-1.5">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-ud-border text-sm focus:outline-none focus:ring-2 focus:ring-ud-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-ud-text-secondary mb-1.5">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-ud-border text-sm focus:outline-none focus:ring-2 focus:ring-ud-primary" />
        </div>
        <Select
          label="Branch"
          value={branchId}
          onValueChange={setBranchId}
          options={[{ value: "all", label: "All branches" }, ...branches.map((b) => ({ value: b.id, label: b.name }))]}
        />
        <Select
          label="Payment method"
          value={method}
          onValueChange={setMethod}
          options={[
            { value: "all", label: "All methods" },
            { value: "mpesa", label: "M-Pesa" },
            { value: "cash", label: "Cash" },
            { value: "card", label: "Card" },
          ]}
        />
      </div>

      {loading ? <StatRowSkeleton /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total sales" value={totalSales} variant="teal" prefix="TSh" format="compact" />
          <StatCard label="Gross profit" value={grossProfit} variant="emerald" prefix="TSh" format="compact" />
          <StatCard label="Transactions" value={sales.length} variant="blue" format="raw" />
          <StatCard label="Average basket" value={avgBasket} variant="gold" prefix="TSh" format="compact" />
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={10} columns={7} />
      ) : sales.length === 0 ? (
        <EmptyState
          icon={ReceiptIcon}
          title="No sales found"
          description="No point-of-sale transactions match these filters. Try widening the date range or ring up a sale on the Register."
        />
      ) : (
        <DataTable
          data={sales}
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
