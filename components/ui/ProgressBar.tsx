"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface ProgressBarProps {
  value: number; // 0 - 100
  variant?: "teal" | "gold" | "danger" | "warning";
  height?: number;
  showLabel?: boolean;
  className?: string;
}

const VARIANT_BG: Record<NonNullable<ProgressBarProps["variant"]>, string> = {
  teal:    "bg-ud-primary",
  gold:    "bg-ud-gold",
  danger:  "bg-ud-danger",
  warning: "bg-ud-warning",
};

export function ProgressBar({
  value,
  variant = "teal",
  height = 6,
  showLabel,
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("w-full", className)}>
      <div
        className="w-full rounded-full overflow-hidden bg-ud-primary-50"
        style={{ height }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className={cn("h-full rounded-full", VARIANT_BG[variant])}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-xs text-ud-text-muted text-right tabular-nums">
          {clamped.toFixed(0)}%
        </div>
      )}
    </div>
  );
}
