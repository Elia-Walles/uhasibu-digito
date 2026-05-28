"use client";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatTZS } from "@/lib/utils/currency";

const DATA = [
  { year: "2020", cost: 280_000_000, nbv: 280_000_000 },
  { year: "2021", cost: 280_000_000, nbv: 244_500_000 },
  { year: "2022", cost: 280_000_000, nbv: 219_700_000 },
  { year: "2023", cost: 280_000_000, nbv: 198_300_000 },
  { year: "2024", cost: 280_000_000, nbv: 178_400_000 },
  { year: "2025F", cost: 280_000_000, nbv: 161_500_000 },
  { year: "2026F", cost: 280_000_000, nbv: 146_300_000 },
];

export function DepreciationChart({ height = 280 }: { height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={DATA} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="dep-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F7B5E" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#0F7B5E" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5F0EC" />
        <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatTZS(Number(v), true).replace("TSh ", "")} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #E5F0EC", fontSize: 12 }}
          formatter={(value) => formatTZS(Number(value))}
        />
        <Area type="monotone" dataKey="nbv" stroke="#0F7B5E" strokeWidth={2.5} fill="url(#dep-area)" animationDuration={1100} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
