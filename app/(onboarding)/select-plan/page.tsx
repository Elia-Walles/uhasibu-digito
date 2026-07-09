"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Lock, LogOut, Sparkles } from "lucide-react";
import { PricingCard } from "@/components/billing/PricingCard";
import { SubscriptionInvoiceView } from "@/components/billing/SubscriptionInvoiceView";
import { BillingIntervalToggle } from "@/components/ui/BillingIntervalToggle";
import { normalizeTier, minTierForPath, type Tier, type BillingInterval } from "@/lib/auth/tiers";
import { createSubscriptionInvoice, submitSubscriptionInvoice } from "@/lib/server/actions/billing";
import { usePublicPlans } from "@/lib/hooks/usePublicPlans";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useSignOut } from "@/lib/auth/client";
import { useT } from "@/lib/hooks/useT";
import type { SubscriptionInvoiceView as Invoice } from "@/types/billing";
import toast from "react-hot-toast";

function moduleLabel(path: string): string {
  const seg = path.split("/").filter(Boolean)[0] ?? "";
  return seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "that module";
}

function SelectPlanInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session, update } = useSession();
  const signOut = useSignOut();
  const t = useT();
  const { plans, loading } = usePublicPlans();
  const [pending, setPending] = useState<Tier | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [interval, setInterval] = useState<BillingInterval>(params.get("interval") === "month" ? "month" : "year");

  const currentTier = normalizeTier(session?.user?.tier);
  const from = params.get("from");
  const requiredTier = from ? minTierForPath(from) : null;
  const preselect = params.get("plan");
  const autoChosen = useRef(false);

  async function choose(tier: Exclude<Tier, "free">) {
    setPending(tier);
    try {
      const res = await createSubscriptionInvoice({ planKey: tier, interval });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setInvoice(res.data);
    } finally {
      setPending(null);
    }
  }

  async function onDoneInvoice() {
    if (!invoice) return;
    setSubmitting(true);
    try {
      const res = await submitSubscriptionInvoice({ invoiceId: invoice.id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      await update(); // apply the pending-approval gate
      toast.success(t("Invoice sent. We'll activate your account once payment is confirmed."));
      router.push("/pending-approval");
    } finally {
      setSubmitting(false);
    }
  }

  // Auto-activate a plan carried over from the public pricing page (/select-plan?plan=key).
  useEffect(() => {
    if (autoChosen.current || loading || !preselect) return;
    const match = plans.find((p) => p.id === preselect);
    if (!match || currentTier === match.id) return;
    autoChosen.current = true;
    void choose(match.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when plans resolve
  }, [loading, plans, preselect]);

  return (
    <div className="relative min-h-screen bg-ud-surface-3 overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-ud-primary opacity-10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-ud-gold opacity-10 blur-3xl" />

      <header className="relative flex items-center justify-between px-5 sm:px-8 h-16 border-b border-ud-border bg-ud-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Image src="/images/uhasibu-digito-circle.png" alt="Uhasibu Digito" width={32} height={32} className="w-8 h-8 rounded-lg" priority />
          <span className="font-display font-bold">Uhasibu Digito</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button onClick={() => void signOut()} className="inline-flex items-center gap-1.5 text-sm text-ud-text-muted hover:text-ud-text-primary transition-colors">
            <LogOut className="w-4 h-4" /> {t("Sign out")}
          </button>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-4 sm:px-8 py-10 sm:py-14">
        {invoice ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-balance">{t("Complete your payment")}</h1>
              <p className="mt-2 text-sm text-ud-text-muted text-balance">
                {t("Pay this invoice by bank transfer, then click Done. We'll activate your account once payment is confirmed.")}
              </p>
            </div>
            <SubscriptionInvoiceView
              invoice={invoice}
              submitting={submitting}
              onDone={() => void onDoneInvoice()}
              onBack={() => setInvoice(null)}
            />
          </div>
        ) : (
        <>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col items-center text-center max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center gap-1.5 rounded-full bg-ud-primary-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ud-primary">
            <Sparkles className="w-3 h-3" /> {t("Choose your plan")}
          </div>
          <h1 className="mt-4 font-display font-extrabold text-3xl sm:text-4xl text-balance">{t("Choose the plan that fits your business")}</h1>
          <p className="mt-3 text-ud-text-secondary text-balance">
            {t("Start with Point of Sale and upgrade any time as you grow into full accounting, tax and payroll.")}
          </p>
        </motion.div>

        <BillingIntervalToggle interval={interval} onChange={setInterval} className="mt-8 justify-center" />

        {from && requiredTier && (
          <div className="mt-6 mx-auto max-w-2xl flex items-center gap-2.5 rounded-2xl border border-ud-warning/30 bg-ud-warning-bg px-4 py-3 text-sm text-ud-text-secondary">
            <Lock className="w-4 h-4 text-ud-warning flex-shrink-0" />
            <span>
              <strong className="font-semibold">{t(moduleLabel(from))}</strong> {t("needs the")}{" "}
              <strong className="font-semibold capitalize">{requiredTier}</strong> {t("plan or higher. Pick a plan below to unlock it.")}
            </span>
          </div>
        )}

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 items-start">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} className="h-96" />)
            : plans.map((plan) => (
                <PricingCard
                  key={plan.id}
                  plan={plan}
                  isCurrent={currentTier === plan.id}
                  loading={pending === plan.id}
                  onSelect={() => void choose(plan.id)}
                  interval={interval}
                />
              ))}
        </div>

        <p className="mt-8 text-center text-xs text-ud-text-muted">
          {t("Prices in Tanzanian Shillings (TZS), billed {interval}ly. You can change your plan at any time from Settings.", { interval })}
        </p>
        </>
        )}
      </main>
    </div>
  );
}

export default function SelectPlanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ud-surface-3" />}>
      <SelectPlanInner />
    </Suspense>
  );
}
