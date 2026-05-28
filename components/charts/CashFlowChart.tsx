"use client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { formatTZS } from "@/lib/utils/currency";

const DATA = [
  { name: "Opening Cash",   value: 287_900_000, color: "#6B7280" },
  { name: "Operating",      value: 81_360_000,  color: "#0F7B5E" },
  { name: "Investing",      value: -62_500_000, color: "#DC2626" },
  { name: "Financing",      value: 6_040_000,   color: "#F5C842" },
  { name: "Closing Cash",   value: 312_800_000, color: "#0A1F16" },
];

export function CashFlowChart({ height = 280 }: { height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={DATA} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5F0EC" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "#6B7280" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatTZS(Number(v), true).replace("TSh ", "")}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #E5F0EC",
            boxShadow: "0 8px 32px -8px rgba(10,35,24,0.12)",
            fontSize: 12,
          }}
          formatter={(value) => formatTZS(Number(value))}
        />
        <Bar dataKey="value" radius={[6, 6, 6, 6]} animationDuration={1100}>
          {DATA.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
