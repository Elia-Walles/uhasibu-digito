"use client";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { MONTHLY_REVENUE } from "@/lib/mock-data/financial-statements";
import { formatTZS } from "@/lib/utils/currency";

interface RevenueChartProps {
  data?: typeof MONTHLY_REVENUE;
  height?: number;
}

export function RevenueChart({ data = MONTHLY_REVENUE, height = 320 }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="rev-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F7B5E" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#14A87E" stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="exp-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D97706" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.55} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5F0EC" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
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
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="circle" />
        <Bar dataKey="revenue" name="Revenue" fill="url(#rev-bar)" radius={[6, 6, 0, 0]} animationDuration={1100} />
        <Bar dataKey="expenses" name="Expenses" fill="url(#exp-bar)" radius={[6, 6, 0, 0]} animationDuration={1100} />
        <Line
          type="monotone"
          dataKey="profit"
          name="Net Profit"
          stroke="#F5C842"
          strokeWidth={3}
          dot={{ r: 4, fill: "#F5C842", strokeWidth: 2, stroke: "#fff" }}
          activeDot={{ r: 6 }}
          animationDuration={1300}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
