"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

/** A surface card for the admin shell (matches the client app's light theme). */
export function AdminPanel({
  children,
  className,
  title,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl bg-ud-surface border border-ud-border shadow-card p-5", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="font-display font-bold text-ud-text-primary text-base">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/** Page heading for the admin shell. */
export function AdminPageTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-ud-text-primary text-balance">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ud-text-muted text-balance">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const PILL_TONE: Record<string, string> = {
  active: "bg-ud-success-bg text-ud-success",
  recorded: "bg-ud-success-bg text-ud-success",
  past_due: "bg-ud-warning-bg text-ud-warning",
  trialing: "bg-ud-info-bg text-ud-info",
  canceled: "bg-ud-surface-2 text-ud-text-muted border border-ud-border",
  disabled: "bg-ud-surface-2 text-ud-text-muted border border-ud-border",
  reversed: "bg-ud-danger-bg text-ud-danger",
  free: "bg-ud-surface-2 text-ud-text-muted border border-ud-border",
  starter: "bg-ud-info-bg text-ud-info",
  business: "bg-ud-primary-50 text-ud-primary",
  standard: "bg-ud-primary-100 text-ud-primary",
  premium: "bg-ud-gold-50 text-ud-gold-dark",
  enterprise: "bg-ud-gold-50 text-ud-gold-dark",
};

export function StatusPill({ value }: { value: string }) {
  const tone = PILL_TONE[value.toLowerCase()] ?? "bg-ud-surface-2 text-ud-text-secondary border border-ud-border";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize", tone)}>
      {value.replace(/_/g, " ")}
    </span>
  );
}

/** Compact KPI tile for the overview grid. */
export function AdminKpi({
  label,
  value,
  hint,
  index = 0,
}: {
  label: string;
  value: string;
  hint?: string;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2 }}
      className="rounded-2xl bg-ud-surface border border-ud-border shadow-card hover:shadow-card-hover transition-shadow p-5"
    >
      <div className="text-[11px] uppercase tracking-[0.1em] text-ud-text-muted">{label}</div>
      <div className="mt-2 font-display text-2xl font-extrabold text-ud-text-primary tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-ud-text-faint">{hint}</div>}
    </motion.div>
  );
}
