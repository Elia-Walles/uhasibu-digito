"use client";
import Link from "next/link";
import { Boxes, AlertTriangle, Package, ArrowLeftRight } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { StatRowSkeleton } from "@/components/skeletons/StatRowSkeleton";
import { ChartSkeleton } from "@/components/skeletons/ChartSkeleton";
import { useInventory } from "@/lib/hooks/useInventory";
import { useT } from "@/lib/hooks/useT";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ChartTooltip } from "recharts";

const CATEGORY_COLORS = ["#0F7B5E", "#14A87E", "#F5C842", "#C47B2A", "#2563EB", "#94A3B8"];

export default function InventoryHome() {
  const t = useT();
  const { inventory: INVENTORY, loading: invLoading } = useInventory();
  const loading = invLoading;
  const totalValue = INVENTORY.reduce((s, i) => s + i.totalValue, 0);
  const lowStock   = INVENTORY.filter((i) => i.status === "LowStock").length;
  const outOfStock = INVENTORY.filter((i) => i.status === "OutOfStock").length;

  const byCategory = INVENTORY.reduce<Record<string, number>>((acc, i) => {
    acc[i.category] = (acc[i.category] ?? 0) + i.totalValue;
    return acc;
  }, {});
  const categoryData = Object.entries(byCategory).map(([name, value], i) => ({ name, value, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));

  return (
    <PageWrapper>
      <PageHeader
        title="Inventory"
        subtitle={t("{skus} SKUs across {cats} categories", { skus: INVENTORY.length, cats: categoryData.length })}
        actions={
          <>
            <Link href="/inventory/movements"><Button variant="outline" icon={<ArrowLeftRight className="w-4 h-4" />}>{t("Movements")}</Button></Link>
            <Link href="/inventory/items"><Button variant="primary" icon={<Boxes className="w-4 h-4" />}>{t("Manage items")}</Button></Link>
          </>
        }
      />

      {loading ? <StatRowSkeleton /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total stock value" value={totalValue}        prefix="TSh" variant="teal"    icon={<Package />} format="compact" />
          <StatCard label="SKUs in stock"     value={INVENTORY.filter((i) => i.status === "InStock").length} variant="emerald" format="raw" />
          <StatCard label="Low stock"         value={lowStock}          variant="amber" trendValue={-3} trendInvert format="raw"   footer={t("Action recommended")} />
          <StatCard label="Out of stock"      value={outOfStock}        variant="blue"  format="raw"   footer={t("Reorder needed")} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-white border border-ud-border rounded-2xl p-5 shadow-card">
          <h3 className="font-display font-bold text-base mb-3">{t("Inventory by category")}</h3>
          {loading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius="55%" outerRadius="92%" dataKey="value" paddingAngle={2} animationDuration={1100}>
                  {categoryData.map((c, i) => <Cell key={i} fill={c.color} stroke="#fff" strokeWidth={2} />)}
                </Pie>
                <ChartTooltip formatter={(v) => `TSh ${Number(v).toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-base">{t("Low stock alerts")}</h3>
            <AlertTriangle className="w-4 h-4 text-ud-warning" />
          </div>
          <div className="space-y-2.5">
            {INVENTORY.filter((i) => i.status === "LowStock" || i.status === "OutOfStock").slice(0, 6).map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-2 py-2 border-b border-ud-border last:border-b-0">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{i.name}</div>
                  <div className="text-xs text-ud-text-muted">{i.code} · {i.location}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-bold text-ud-warning">{i.onHand}</div>
                  <div className="text-[10px] text-ud-text-muted">/ {i.reorderLevel}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
