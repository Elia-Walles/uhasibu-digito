"use client";
import { motion } from "framer-motion";
import { useCountUp } from "@/lib/hooks/useNumberAnimation";
import { useEffect, useState } from "react";
import { formatTZS } from "@/lib/utils/currency";
import { TrendBadge } from "./TrendBadge";
import { SkeletonCard } from "./Skeleton";
import { useT } from "@/lib/hooks/useT";
import { cn } from "@/lib/utils/cn";

interface StatCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  trendValue?: number;
  trendInvert?: boolean;
  icon?: React.ReactNode;
  variant?: "teal" | "emerald" | "blue" | "amber" | "gold" | "neutral";
  loading?: boolean;
  format?: "currency" | "compact" | "number" | "raw";
  className?: string;
  footer?: React.ReactNode;
}

const VARIANTS: Record<NonNullable<StatCardProps["variant"]>, { bg: string; iconBg: string; text: string }> = {
  teal:    { bg: "gradient-teal",        iconBg: "bg-white/15", text: "text-white" },
  emerald: { bg: "gradient-emerald",     iconBg: "bg-white/15", text: "text-white" },
  blue:    { bg: "gradient-blue",        iconBg: "bg-white/15", text: "text-white" },
  amber:   { bg: "gradient-amber",       iconBg: "bg-white/15", text: "text-white" },
  gold:    { bg: "gradient-gold",        iconBg: "bg-ud-obsidian/10", text: "text-ud-obsidian" },
  neutral: { bg: "bg-white border border-ud-border", iconBg: "bg-ud-primary-50", text: "text-ud-text-primary" },
};

export function StatCard({
  label,
  value,
  prefix = "",
  suffix = "",
  trendValue,
  trendInvert,
  icon,
  variant = "teal",
  loading,
  format = "currency",
  className,
  footer,
}: StatCardProps) {
  const t = useT();
  if (loading) return <SkeletonCard {...(className ? { className } : {})} />;
  const v = VARIANTS[variant];
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        "group relative overflow-hidden rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-shadow",
        v.bg,
        v.text,
        className
      )}
    >
      {/* Light sweep on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full motion-reduce:transition-none motion-reduce:hidden"
      />
      {icon && (
        <div className={cn("absolute top-4 right-4 opacity-25 text-3xl")} aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="text-xs font-medium opacity-80 tracking-[0.06em] uppercase">{t(label)}</div>
      <div className="mt-3 flex items-baseline gap-1.5">
        {prefix && <span className="font-mono text-base opacity-90">{prefix}</span>}
        <AnimatedNumber value={value} format={format} className="font-display font-bold text-2xl sm:text-3xl tabular-nums leading-tight break-words" />
        {suffix && <span className="font-mono text-sm opacity-90">{suffix}</span>}
      </div>
      {trendValue !== undefined && (
        <div className="mt-2.5">
          <span className={variant === "neutral" ? "" : "bg-white/15 rounded-full"}>
            <TrendBadge value={trendValue} {...(trendInvert !== undefined && { invert: trendInvert })} />
          </span>
        </div>
      )}
      {footer && <div className="mt-3 text-xs opacity-80">{footer}</div>}
    </motion.div>
  );
}

function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number;
  format: NonNullable<StatCardProps["format"]>;
  className?: string;
}) {
  const rounded = useCountUp(value);
  const [display, setDisplay] = useState<string>("0");
  useEffect(() => {
    const unsub = rounded.on("change", (latest) => {
      const num = typeof latest === "number" ? latest : Number(latest);
      // "compact" is retained for API compatibility but no longer abbreviates — financial cards
      // always show full grouped numbers (e.g. 90,000,000), never 90M / 1K.
      if (format === "currency" || format === "compact") setDisplay(formatTZS(num));
      else if (format === "number") setDisplay(num.toLocaleString());
      else setDisplay(String(num));
    });
    return () => unsub();
  }, [rounded, format]);
  return <span className={className}>{display}</span>;
}
