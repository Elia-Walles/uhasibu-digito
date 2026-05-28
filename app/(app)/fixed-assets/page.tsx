"use client";
import Link from "next/link";
import { Car, Computer, Building, Sofa, Wrench, TrendingDown } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatCard } from "@/components/ui/StatCard";
import { StatRowSkeleton } from "@/components/skeletons/StatRowSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { useLoadingSimulation } from "@/lib/hooks/useLoadingSimulation";
import { FIXED_ASSETS } from "@/lib/mock-data/assets";
import type { FixedAsset, AssetCategory } from "@/types";

const CAT_ICON: Record<AssetCategory, React.ElementType> = {
  Vehicle: Car, Computer, Building, Furniture: Sofa, Equipment: Wrench,
};
const CAT_COLOR: Record<AssetCategory, "teal" | "info" | "warning" | "gold" | "default"> = {
  Vehicle: "info", Computer: "teal", Building: "warning", Furniture: "gold", Equipment: "default",
};

const COLS: Column<FixedAsset>[] = [
  { key: "code", label: "Code", className: "font-mono text-xs", width: "90px" },
  { key: "name", label: "Asset", render: (r) => {
    const Icon = CAT_ICON[r.category];
    return <div className="flex items-center gap-2"><Icon className="w-4 h-4 text-ud-text-muted" /><span className="font-medium">{r.name}</span></div>;
  } },
  { key: "category", label: "Category", render: (r) => <Badge variant={CAT_COLOR[r.category]} size="sm">{r.category}</Badge> },
  { key: "cost", label: "Cost", sortable: true, align: "right", render: (r) => <CurrencyDisplay amount={r.cost} showSymbol={false} /> },
  { key: "accumulatedDepreciation", label: "Accum. dep.", align: "right", render: (r) => <CurrencyDisplay amount={r.accumulatedDepreciation} showSymbol={false} className="text-ud-danger" /> },
  { key: "netBookValue", label: "NBV", sortable: true, align: "right", render: (r) => <CurrencyDisplay amount={r.netBookValue} showSymbol={false} className="font-bold" /> },
  { key: "status", label: "Status", render: (r) => <Badge variant={r.status === "Active" ? "success" : r.status === "Disposed" ? "default" : "warning"}>{r.status}</Badge> },
];

export default function FixedAssetsPage() {
  const loading = useLoadingSimulation(800);
  const totalCost = FIXED_ASSETS.reduce((s, a) => s + a.cost, 0);
  const totalNBV  = FIXED_ASSETS.reduce((s, a) => s + a.netBookValue, 0);
  const totalDep  = FIXED_ASSETS.reduce((s, a) => s + a.accumulatedDepreciation, 0);

  return (
    <PageWrapper>
      <PageHeader
        title="Fixed Assets"
        subtitle={`${FIXED_ASSETS.length} assets in the register`}
        actions={<Link href="/fixed-assets/depreciation"><Button variant="primary" icon={<TrendingDown className="w-4 h-4" />}>Depreciation schedule</Button></Link>}
      />

      {loading ? <StatRowSkeleton /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total cost"        value={totalCost} variant="teal"  prefix="TSh" format="compact" />
          <StatCard label="Accum. depreciation" value={totalDep}  variant="amber" prefix="TSh" format="compact" />
          <StatCard label="Net book value"    value={totalNBV}  variant="emerald" prefix="TSh" format="compact" />
          <StatCard label="Active assets"      value={FIXED_ASSETS.filter((a) => a.status === "Active").length} variant="blue" format="raw" />
        </div>
      )}

      {loading ? <TableSkeleton rows={10} columns={7} /> :
        <DataTable data={FIXED_ASSETS} columns={COLS} pageSize={15} initialSortKey="cost" rowKey={(r) => r.id} />
      }
    </PageWrapper>
  );
}
