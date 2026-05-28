"use client";
import { Plus } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { useDataStore } from "@/lib/store/dataStore";
import { formatDate } from "@/lib/utils/dates";
import { useLoadingSimulation } from "@/lib/hooks/useLoadingSimulation";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

interface Quotation {
  id: string;
  number: string;
  customer: string;
  date: string;
  validUntil: string;
  total: number;
  status: "Draft" | "Sent" | "Accepted" | "Expired";
}

const STATUS_BADGE = { Draft: "warning", Sent: "info", Accepted: "success", Expired: "danger" } as const;

export default function QuotationsPage() {
  const loading = useLoadingSimulation(800);
  const { customers } = useDataStore();

  // Treat the first 20 invoices as fake quotations
  const quotations: Quotation[] = customers.slice(0, 20).map((c, i) => ({
    id: `quote_${i}`,
    number: `QUO-2024-${String(i + 1).padStart(5, "0")}`,
    customer: c.name,
    date: `2024-10-${String((i % 28) + 1).padStart(2, "0")}`,
    validUntil: `2024-11-${String((i % 28) + 1).padStart(2, "0")}`,
    total: 1_000_000 + i * 850_000,
    status: (["Draft", "Sent", "Accepted", "Expired"] as const)[i % 4]!,
  }));

  const COLS: Column<Quotation>[] = [
    { key: "number",     label: "Quotation #", className: "font-mono text-xs" },
    { key: "customer",   label: "Customer",    sortable: true },
    { key: "date",       label: "Date",        sortable: true, render: (r) => formatDate(r.date) },
    { key: "validUntil", label: "Valid until", render: (r) => formatDate(r.validUntil) },
    { key: "total",      label: "Total",       sortable: true, align: "right", render: (r) => <CurrencyDisplay amount={r.total} className="font-medium" /> },
    { key: "status",     label: "Status",      render: (r) => <Badge variant={STATUS_BADGE[r.status]}>{r.status}</Badge> },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Quotations"
        subtitle={`${quotations.length} quotations · ${quotations.filter((q) => q.status === "Accepted").length} accepted`}
        breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Quotations" }]}
        actions={<Button variant="primary" icon={<Plus className="w-4 h-4" />}>New quotation</Button>}
      />
      {loading ? <TableSkeleton rows={10} columns={6} /> :
        <DataTable data={quotations} columns={COLS} pageSize={10} initialSortKey="date" initialSortDir="desc" rowKey={(r) => r.id} />
      }
    </PageWrapper>
  );
}
