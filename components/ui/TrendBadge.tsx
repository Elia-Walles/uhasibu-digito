import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface TrendBadgeProps {
  value: number;
  invert?: boolean; // for cases where down is good (e.g. expenses)
  size?: "sm" | "md";
  className?: string;
}

export function TrendBadge({ value, invert = false, size = "sm", className }: TrendBadgeProps) {
  const positive = invert ? value < 0 : value > 0;
  const negative = invert ? value > 0 : value < 0;
  const Icon = value === 0 ? Minus : value > 0 ? ArrowUp : ArrowDown;
  const color = value === 0
    ? "bg-ud-surface-2 text-ud-text-muted"
    : positive
    ? "bg-ud-success-bg text-ud-success"
    : negative
    ? "bg-ud-danger-bg text-ud-danger"
    : "bg-ud-surface-2 text-ud-text-muted";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-medium rounded-full",
        size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1",
        color,
        className
      )}
    >
      <Icon className={size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"} />
      {`${value > 0 ? "+" : ""}${value.toFixed(1)}%`}
    </span>
  );
}
