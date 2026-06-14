"use client";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatAmount } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import type { Plan } from "@/lib/auth/tiers";

interface PricingCardProps {
  plan: Plan;
  isCurrent: boolean;
  loading: boolean;
  onSelect: () => void;
}

export function PricingCard({ plan, isCurrent, loading, onSelect }: PricingCardProps) {
  const dark = plan.highlighted;
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn(
        "relative flex h-full flex-col rounded-3xl border p-5",
        dark
          ? "bg-ud-obsidian border-ud-obsidian text-white shadow-[0_24px_60px_-20px_rgba(15,123,94,0.45)]"
          : "bg-ud-surface border-ud-border shadow-card",
      )}
    >
      {plan.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ud-primary text-white text-[11px] font-semibold uppercase tracking-[0.08em]">
          <Sparkles className="w-3 h-3" /> Most popular
        </div>
      )}
      <div className={cn("text-xs font-semibold uppercase tracking-[0.08em]", dark ? "text-ud-primary-glow" : "text-ud-primary")}>
        {plan.name}
      </div>
      <div className="mt-3 flex items-baseline gap-1 flex-wrap">
        <span className="font-display font-extrabold text-2xl tabular-nums break-all">TZS {formatAmount(plan.priceTzs)}</span>
        <span className={cn("text-xs", dark ? "text-white/55" : "text-ud-text-muted")}>/year</span>
      </div>
      <p className={cn("mt-1.5 text-[13px] leading-snug", dark ? "text-white/65" : "text-ud-text-secondary")}>{plan.tagline}</p>

      <div className={cn("my-4 h-px", dark ? "bg-white/10" : "bg-ud-border")} />

      <ul className="space-y-2 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[13px] leading-snug">
            <span className={cn("mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center", dark ? "bg-ud-primary-glow/20 text-ud-primary-glow" : "bg-ud-primary-50 text-ud-primary")}>
              <Check className="w-3 h-3" />
            </span>
            <span className={cn("min-w-0 break-words", dark ? "text-white/80" : "text-ud-text-secondary")}>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5">
        <Button
          variant={dark ? "gold" : isCurrent ? "outline" : "primary"}
          size="md"
          fullWidth
          loading={loading}
          disabled={isCurrent}
          onClick={onSelect}
        >
          {isCurrent ? "Current plan" : "Get started"}
        </Button>
      </div>
    </motion.div>
  );
}
