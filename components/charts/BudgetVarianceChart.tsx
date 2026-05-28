"use client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { BUDGET_LINES } from "@/lib/mock-data/budgets";
import { formatTZS } from "@/lib/utils/currency";

export function BudgetVarianceChart({ height = 360 }: { height?: number }) {
  const data = BUDGET_LINES.map((b) => ({
    name: b.lineItem,
    variance: b.ytdVariance,
    color: b.ytdVariance >= 0 ? "#0F7B5E" : "#DC2626",
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 16, left: 100, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5F0EC" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#6B7280" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatTZS(Number(v), true).replace("TSh ", "")}
        />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#374151" }} axisLine={false} tickLine={false} width={100} />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #E5F0EC",
            boxShadow: "0 8px 32px -8px rgba(10,35,24,0.12)",
            fontSize: 12,
          }}
          formatter={(value) => formatTZS(Number(value))}
        />
        <Bar dataKey="variance" radius={[0, 6, 6, 0]} animationDuration={1100}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
