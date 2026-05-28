"use client";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { EXPENSE_BREAKDOWN } from "@/lib/mock-data/financial-statements";
import { formatTZS } from "@/lib/utils/currency";

interface ExpenseDonutProps {
  height?: number;
}

export function ExpenseDonut({ height = 320 }: ExpenseDonutProps) {
  const total = EXPENSE_BREAKDOWN.reduce((s, e) => s + e.value, 0);
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1" style={{ minHeight: height - 100 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={EXPENSE_BREAKDOWN}
              cx="50%"
              cy="50%"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              dataKey="value"
              animationDuration={1100}
            >
              {EXPENSE_BREAKDOWN.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="#fff" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #E5F0EC",
                boxShadow: "0 8px 32px -8px rgba(10,35,24,0.12)",
                fontSize: 12,
              }}
              formatter={(value) => formatTZS(Number(value))}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
        {EXPENSE_BREAKDOWN.map((e) => (
          <div key={e.name} className="flex items-center gap-1.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: e.color }} />
            <span className="text-ud-text-secondary truncate">{e.name}</span>
            <span className="ml-auto font-mono tabular-nums text-ud-text-muted">
              {((e.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
