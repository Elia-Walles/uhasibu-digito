"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { FilterBar } from "@/components/ui/FilterBar";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { useLoadingSimulation } from "@/lib/hooks/useLoadingSimulation";
import { useDataStore } from "@/lib/store/dataStore";
import { formatDate, isOverdue } from "@/lib/utils/dates";
import type { Invoice, InvoiceStatus } from "@/types";

const COLS: Column<Invoice>[] = [
  { key: "number",        label: "Invoice #",  sortable: true, className: "font-mono text-xs" },
  { key: "customerName",  label: "Customer",   sortable: true, render: (r) => <div className="font-medium truncate max-w-[200px]">{r.customerName}</div> },
  { key: "issueDate",     label: "Issued",     sortable: true, render: (r) => formatDate(r.issueDate) },
  { key: "dueDate",       label: "Due",        sortable: true, render: (r) => <span className={isOverdue(r.dueDate) && r.status !== "Paid" ? "text-ud-danger font-medium" : ""}>{formatDate(r.dueDate)}</span> },
  { key: "total",         label: "Total",      sortable: true, align: "right", render: (r) => <CurrencyDisplay amount={r.total} showSymbol={false} className="font-medium" /> },
  { key: "status",        label: "Status",     render: (r) => (
    <Badge variant={
      r.status === "Paid"      ? "success" :
      r.status === "Overdue"   ? "danger"  :
      r.status === "Sent"      ? "info"    :
      r.status === "Draft"     ? "warning" : "default"
    } pulse={r.status === "Overdue"}>
      {r.status}
    </Badge>
  ) },
];

type TabKey = "All" | "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled";

export default function InvoicesPage() {
  const loading = useLoadingSimulation(800);
  const { invoices } = useDataStore();
  const [tab, setTab] = useState<TabKey>("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let data = invoices;
    if (tab !== "All") data = data.filter((i) => i.status === (tab as InvoiceStatus));
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((i) => i.number.toLowerCase().includes(q) || i.customerName.toLowerCase().includes(q));
    }
    return data;
  }, [invoices, tab, search]);

  const tabs = useMemo(() => [
    { value: "All",      label: "All",      badge: <Badge variant="default" size="sm">{invoices.length}</Badge> },
    { value: "Draft",    label: "Draft",    badge: <Badge variant="warning" size="sm">{invoices.filter((i) => i.status === "Draft").length}</Badge> },
    { value: "Sent",     label: "Sent",     badge: <Badge variant="info" size="sm">{invoices.filter((i) => i.status === "Sent").length}</Badge> },
    { value: "Paid",     label: "Paid",     badge: <Badge variant="success" size="sm">{invoices.filter((i) => i.status === "Paid").length}</Badge> },
    { value: "Overdue",  label: "Overdue",  badge: <Badge variant="danger" size="sm">{invoices.filter((i) => i.status === "Overdue").length}</Badge> },
    { value: "Cancelled", label: "Cancelled" },
  ], [invoices]);

  return (
    <PageWrapper>
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} invoices · TZS ${Math.round(invoices.reduce((s, i) => s + i.total, 0) / 1_000_000)}M total`}
        breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Invoices" }]}
        actions={
          <>
            <ExportMenu fileLabel="Invoices" />
            <Link href="/sales/new-invoice"><Button variant="primary" icon={<Plus className="w-4 h-4" />}>New invoice</Button></Link>
          </>
        }
      />

      <div className="bg-white border border-ud-border rounded-2xl shadow-card mb-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} tabs={tabs} />
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search invoice # or customer…" />

      {loading ? <TableSkeleton rows={10} columns={6} /> :
        <DataTable data={filtered} columns={COLS} pageSize={15} initialSortKey="issueDate" initialSortDir="desc" rowKey={(r) => r.id} />
      }
    </PageWrapper>
  );
}
