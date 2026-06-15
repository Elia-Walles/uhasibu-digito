"use client";
import { useState, useMemo } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatRowSkeleton } from "@/components/skeletons/StatRowSkeleton";
import { ChartSkeleton } from "@/components/skeletons/ChartSkeleton";
import { useBranches } from "@/lib/hooks/useBranches";
import { usePOSAnalytics, type POSFilter } from "@/lib/hooks/usePOS";
import { formatTZS } from "@/lib/utils/currency";
import { useT } from "@/lib/hooks/useT";
import type { PaymentMethod } from "@/types";

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid #E5F0EC",
  boxShadow: "0 8px 32px -8px rgba(10,35,24,0.12)",
  fontSize: 12,
};
const axisTZS = (v: number | string) => formatTZS(Number(v), true).replace("TSh ", "");
const PAYMENT_COLOR: Record<PaymentMethod, string> = { mpesa: "#0F7B5E", cash: "#2563EB", card: "#F5C842" };
const PAYMENT_LABEL: Record<PaymentMethod, string> = { mpesa: "M-Pesa", cash: "Cash", card: "Card" };

export default function POSAnalyticsPage() {
  const t = useT();
  const { branches } = useBranches();
  const [range, setRange] = useState("30");
  const [branchId, setBranchId] = useState("all");

  const filter = useMemo<POSFilter>(() => {
    const f: POSFilter = {};
    if (range !== "all") {
      const now = new Date();
      const start = new Date(now.getTime() - Number(range) * 24 * 60 * 60 * 1000);
      f.from = start.toISOString().split("T")[0];
      f.to = now.toISOString().split("T")[0];
    }
    if (branchId !== "all") f.branchId = branchId;
    return f;
  }, [range, branchId]);

  const { analytics, loading } = usePOSAnalytics(filter);

  const paymentData = (analytics?.byPaymentMethod ?? []).map((p) => ({
    name: t(PAYMENT_LABEL[p.method]),
    value: p.sales,
    color: PAYMENT_COLOR[p.method],
  }));

  const hasData = (analytics?.transactionCount ?? 0) > 0;

  return (
    <PageWrapper>
      <PageHeader
        title="POS Analytics"
        subtitle="Sales, profit and loss across branches and dates"
        breadcrumbs={[{ label: "Point of Sale", href: "/pos" }, { label: "Analytics" }]}
        actions={
          <div className="flex gap-2">
            <Select
              value={range}
              onValueChange={setRange}
              options={[
                { value: "7", label: "Last 7 days" },
                { value: "30", label: "Last 30 days" },
                { value: "90", label: "Last 90 days" },
                { value: "all", label: "All time" },
              ]}
            />
            <Select
              value={branchId}
              onValueChange={setBranchId}
              options={[{ value: "all", label: "All branches" }, ...branches.map((b) => ({ value: b.id, label: b.name }))]}
            />
          </div>
        }
      />

      {loading || !analytics ? <StatRowSkeleton /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total sales" value={analytics.totalSales} variant="teal" prefix="TSh" format="compact" />
          <StatCard label="Gross profit" value={analytics.grossProfit} variant="emerald" prefix="TSh" format="compact" footer={t("{pct}% margin", { pct: analytics.marginPct.toFixed(1) })} />
          <StatCard label="Cost of sales" value={analytics.costOfSales} variant="amber" prefix="TSh" format="compact" />
          <StatCard label="Transactions" value={analytics.transactionCount} variant="blue" format="raw" footer={t("Avg {amount}", { amount: formatTZS(analytics.averageBasket, true) })} />
        </div>
      )}

      {loading || !analytics ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton /><ChartSkeleton />
        </div>
      ) : !hasData ? (
        <EmptyState
          icon={LineChartIcon}
          title="No sales in this period"
          description="Once you record sales on the Register, profit and loss insights will appear here."
        />
      ) : (
        <div className="space-y-4">
          {/* Revenue vs cost over time */}
          <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card">
            <h3 className="font-display font-bold text-base mb-4">{t("Sales, cost & profit over time")}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.daily} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0F7B5E" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0F7B5E" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1DD4A2" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#1DD4A2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5F0EC" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={axisTZS} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => formatTZS(Number(value))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="sales" name={t("Sales")} stroke="#0F7B5E" strokeWidth={2} fill="url(#gSales)" animationDuration={900} />
                <Area type="monotone" dataKey="grossProfit" name={t("Gross profit")} stroke="#1DD4A2" strokeWidth={2} fill="url(#gProfit)" animationDuration={1100} />
                <Area type="monotone" dataKey="costOfSales" name={t("Cost of sales")} stroke="#DC2626" strokeWidth={2} fillOpacity={0} animationDuration={1100} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gross profit by branch */}
            <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card">
              <h3 className="font-display font-bold text-base mb-4">{t("Sales & profit by branch")}</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analytics.byBranch} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5F0EC" vertical={false} />
                  <XAxis dataKey="branchName" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={axisTZS} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => formatTZS(Number(value))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="sales" name={t("Sales")} fill="#0F7B5E" radius={[6, 6, 0, 0]} animationDuration={900} />
                  <Bar dataKey="grossProfit" name={t("Gross profit")} fill="#F5C842" radius={[6, 6, 0, 0]} animationDuration={1100} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Payment method mix */}
            <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card">
              <h3 className="font-display font-bold text-base mb-4">{t("Payment method mix")}</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} animationDuration={900}>
                    {paymentData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => formatTZS(Number(value))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top items */}
          <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card">
            <h3 className="font-display font-bold text-base mb-4">{t("Top selling products")}</h3>
            <div className="space-y-2.5">
              {analytics.topItems.map((item) => {
                const max = analytics.topItems[0]?.sales || 1;
                return (
                  <div key={item.itemName} className="flex items-center gap-3">
                    <div className="w-32 sm:w-44 truncate text-sm">{item.itemName}</div>
                    <div className="flex-1 h-2 rounded-full bg-ud-surface-2 overflow-hidden">
                      <div className="h-full rounded-full bg-ud-primary" style={{ width: `${Math.max(4, (item.sales / max) * 100)}%` }} />
                    </div>
                    <div className="w-16 text-right text-xs font-mono text-ud-text-muted">{item.quantity}×</div>
                    <div className="w-24 text-right text-sm font-mono font-medium">{formatTZS(item.sales, true)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
