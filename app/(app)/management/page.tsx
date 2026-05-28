"use client";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { RevenueChart } from "@/components/charts/RevenueChart";

const DEPARTMENT_PNL = [
  { dept: "Sales",      revenue: 612_400_000, costs: 312_400_000, profit: 300_000_000 },
  { dept: "Zanzibar",   revenue: 142_300_000, costs: 78_400_000,  profit: 63_900_000 },
  { dept: "Wholesale",  revenue: 92_500_000,  costs: 51_200_000,  profit: 41_300_000 },
];

export default function ManagementAccountingPage() {
  return (
    <PageWrapper>
      <PageHeader title="Management Accounts" subtitle="Departmental P&L, KPIs, ratio analysis" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Gross margin"     value={50.6} suffix="%" variant="teal"    format="raw" trendValue={1.2} />
        <StatCard label="Operating margin" value={14.7} suffix="%" variant="emerald" format="raw" trendValue={2.1} />
        <StatCard label="Net margin"       value={9.5}  suffix="%" variant="blue"    format="raw" trendValue={1.4} />
        <StatCard label="Return on assets" value={9.3}  suffix="%" variant="amber"   format="raw" trendValue={0.8} />
      </div>

      <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card mb-6">
        <h3 className="font-display font-bold text-base mb-3">Revenue, expenses and profit</h3>
        <RevenueChart />
      </div>

      <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card">
        <h3 className="font-display font-bold text-base mb-4">Departmental P&L (YTD)</h3>
        <div className="overflow-x-auto rounded-xl border border-ud-border">
          <table className="w-full text-sm">
            <thead className="bg-ud-surface-2 text-xs uppercase tracking-[0.06em] text-ud-text-secondary">
              <tr>
                <th className="text-left px-4 py-3" scope="col">Department</th>
                <th className="text-right px-4 py-3" scope="col">Revenue</th>
                <th className="text-right px-4 py-3" scope="col">Costs</th>
                <th className="text-right px-4 py-3" scope="col">Profit</th>
                <th className="text-right px-4 py-3" scope="col">Margin</th>
              </tr>
            </thead>
            <tbody>
              {DEPARTMENT_PNL.map((d, i) => (
                <tr key={d.dept} className={i % 2 === 1 ? "bg-ud-surface-2/50" : ""}>
                  <td className="px-4 py-2.5 font-medium">{d.dept}</td>
                  <td className="px-4 py-2.5 text-right"><CurrencyDisplay amount={d.revenue} showSymbol={false} /></td>
                  <td className="px-4 py-2.5 text-right text-ud-danger"><CurrencyDisplay amount={d.costs} showSymbol={false} /></td>
                  <td className="px-4 py-2.5 text-right font-bold"><CurrencyDisplay amount={d.profit} showSymbol={false} /></td>
                  <td className="px-4 py-2.5 text-right font-mono">{((d.profit / d.revenue) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrapper>
  );
}
