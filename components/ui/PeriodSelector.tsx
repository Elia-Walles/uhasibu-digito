"use client";
import { motion } from "framer-motion";
import { CalendarRange } from "lucide-react";
import { PERIOD_OPTIONS, type StatementPeriod } from "@/lib/utils/statements";
import { cn } from "@/lib/utils/cn";

interface PeriodSelectorProps {
  value: StatementPeriod;
  onValueChange: (value: StatementPeriod) => void;
  className?: string;
}

export function PeriodSelector({ value, onValueChange, className }: PeriodSelectorProps) {
  return (
    <div className={cn("inline-flex items-center gap-2 flex-wrap", className)}>
      <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.08em] text-ud-text-muted font-medium">
        <CalendarRange className="w-3.5 h-3.5" />
        Period
      </span>
      <div className="inline-flex items-center p-1 rounded-xl bg-ud-surface-2 border border-ud-border">
        {PERIOD_OPTIONS.map((opt) => {
          const isActive = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onValueChange(opt.value)}
              className={cn(
                "relative px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-primary focus-visible:ring-offset-2",
                isActive ? "text-white" : "text-ud-text-secondary hover:text-ud-text-primary"
              )}
              aria-pressed={isActive}
            >
              {isActive && (
                <motion.span
                  layoutId="period-selector-pill"
                  className="absolute inset-0 rounded-lg bg-ud-primary shadow-sm -z-0"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
