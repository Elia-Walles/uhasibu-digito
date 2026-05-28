"use client";
import { ResponsiveContainer, LineChart, Line } from "recharts";

interface TrendSparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number | string;
}

export function TrendSparkline({
  data,
  color = "#0F7B5E",
  height = 32,
  width = "100%",
}: TrendSparklineProps) {
  const dataset = data.map((v, i) => ({ i, v }));
  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dataset}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
            animationDuration={900}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
