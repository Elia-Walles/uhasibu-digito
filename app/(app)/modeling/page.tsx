"use client";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { formatTZS } from "@/lib/utils/currency";

const FORECAST = [
  { year: "2023",  revenue: 739_600_000, profit: 69_160_000  },
  { year: "2024",  revenue: 847_230_000, profit: 80_500_000  },
  { year: "2025F", revenue: 945_000_000, profit: 92_300_000  },
  { year: "2026F", revenue: 1_058_400_000, profit: 106_100_000 },
  { year: "2027F", revenue: 1_185_400_000, profit: 122_200_000 },
  { year: "2028F", revenue: 1_328_000_000, profit: 140_500_000 },
];

export default function FinancialModelingPage() {
  return (
    <PageWrapper>
      <PageHeader title="Financial Modeling" subtitle="Forecasts, projections, sensitivity analysis" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="5-year CAGR (revenue)" value={9.4} suffix="%" variant="teal" format="raw" />
        <StatCard label="Forecast 2025 revenue" value={945_000_000} prefix="TSh" variant="emerald" format="compact" />
        <StatCard label="Break-even sales"      value={612_000_000} prefix="TSh" variant="amber"   format="compact" />
        <StatCard label="DSCR (interest cover)" value={9.7} suffix="x" variant="blue" format="raw" />
      </div>

      <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card mb-6">
        <h3 className="font-display font-bold text-base mb-3">Revenue & profit projections — 5 year</h3>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={FORECAST} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5F0EC" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatTZS(Number(v), true).replace("TSh ", "")} />
            <Tooltip formatter={(v) => formatTZS(Number(v))} contentStyle={{ borderRadius: 12, border: "1px solid #E5F0EC", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
            <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#0F7B5E" strokeWidth={3} dot={{ r: 4 }} animationDuration={1300} />
            <Line type="monotone" dataKey="profit"  name="Net profit" stroke="#F5C842" strokeWidth={3} dot={{ r: 4 }} animationDuration={1300} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "Break-even analysis", description: "Fixed costs / contribution margin" },
          { title: "Sensitivity", description: "Revenue ±10% impact on operating profit" },
          { title: "Scenarios", description: "Base / upside / downside" },
        ].map((c) => (
          <div key={c.title} className="bg-white border border-ud-border rounded-2xl p-5 shadow-card">
            <div className="font-display font-bold text-base">{c.title}</div>
            <p className="text-xs text-ud-text-muted mt-1">{c.description}</p>
            <div className="mt-4 h-2 bg-gradient-to-r from-ud-primary to-ud-primary-light rounded-full" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
