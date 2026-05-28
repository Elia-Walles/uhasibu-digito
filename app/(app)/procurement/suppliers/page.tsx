"use client";
import { Star } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { useLoadingSimulation } from "@/lib/hooks/useLoadingSimulation";
import { SUPPLIERS } from "@/lib/mock-data/suppliers";
import type { Supplier } from "@/types";

const COLS: Column<Supplier>[] = [
  { key: "name", label: "Supplier", sortable: true, render: (r) => <div><div className="font-medium">{r.name}</div><div className="text-xs text-ud-text-muted">{r.contactPerson}</div></div> },
  { key: "city", label: "City" },
  { key: "tin",  label: "TIN", className: "font-mono text-xs" },
  { key: "paymentTerms", label: "Terms" },
  { key: "outstandingBalance", label: "Outstanding", align: "right", render: (r) => <CurrencyDisplay amount={r.outstandingBalance} compact /> },
  { key: "performanceRating", label: "Rating", align: "right", render: (r) => (
    <div className="inline-flex">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-3 h-3 ${i < r.performanceRating ? "fill-ud-gold text-ud-gold" : "text-ud-border"}`} />
      ))}
    </div>
  ) },
];

export default function SuppliersPage() {
  const loading = useLoadingSimulation(800);
  return (
    <PageWrapper>
      <PageHeader
        title="Suppliers"
        subtitle={`${SUPPLIERS.length} suppliers · performance-rated`}
        breadcrumbs={[{ label: "Procurement", href: "/procurement" }, { label: "Suppliers" }]}
      />
      {loading ? <TableSkeleton rows={10} columns={6} /> :
        <DataTable data={SUPPLIERS} columns={COLS} pageSize={15} initialSortKey="name" rowKey={(r) => r.id} />
      }
    </PageWrapper>
  );
}
