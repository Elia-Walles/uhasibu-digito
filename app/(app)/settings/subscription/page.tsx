"use client";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useTier } from "@/lib/hooks/useTier";
import { PLANS } from "@/lib/auth/tiers";
import { formatAmount } from "@/lib/utils/currency";

export default function SubscriptionSettingsPage() {
  const { tier } = useTier();
  const current = PLANS.find((p) => p.id === tier);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-bold text-lg">Subscription</h2>
          <p className="text-sm text-ud-text-muted">Your current plan and what it unlocks.</p>
        </div>
        <Link href="/select-plan">
          <Button variant="primary" icon={<Sparkles className="w-4 h-4" />}>Change plan</Button>
        </Link>
      </div>

      {current ? (
        <div className="bg-white border border-ud-border rounded-2xl p-6 shadow-card max-w-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-ud-primary">{current.name}</div>
              <div className="mt-1 font-display font-extrabold text-3xl tabular-nums">
                TZS {formatAmount(current.priceTzs)}<span className="text-sm font-normal text-ud-text-muted"> /year</span>
              </div>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
          <p className="mt-2 text-sm text-ud-text-secondary">{current.tagline}</p>
          <div className="my-4 h-px bg-ud-border" />
          <ul className="space-y-2">
            {current.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-ud-text-secondary">
                <span className="mt-0.5 w-4 h-4 rounded-full bg-ud-primary-50 text-ud-primary flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-white border border-ud-border rounded-2xl p-6 shadow-card max-w-xl">
          <p className="text-sm text-ud-text-secondary">You haven&apos;t chosen a plan yet.</p>
          <Link href="/select-plan" className="inline-block mt-3">
            <Button variant="primary">Choose a plan</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
