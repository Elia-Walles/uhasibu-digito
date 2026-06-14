"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Lock, LogOut } from "lucide-react";
import { PricingCard } from "@/components/billing/PricingCard";
import { normalizeTier, minTierForPath, type Tier } from "@/lib/auth/tiers";
import { selectPlan } from "@/lib/server/actions/billing";
import { usePublicPlans } from "@/lib/hooks/usePublicPlans";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useSignOut } from "@/lib/auth/client";
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
  const { plans, loading } = usePublicPlans();
  const [pending, setPending] = useState<Tier | null>(null);

  const currentTier = normalizeTier(session?.user?.tier);
  const from = params.get("from");
  const requiredTier = from ? minTierForPath(from) : null;
  const preselect = params.get("plan");
  const autoChosen = useRef(false);

  async function choose(tier: Exclude<Tier, "free">) {
    setPending(tier);
    try {
      const res = await selectPlan({ tier });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      await update(); // re-reads the tier into the JWT (jwt callback `update` branch)
      toast.success(`You're on the ${tier} plan. Welcome aboard!`);
      router.push(from && requiredTier ? from : "/dashboard");
    } finally {
      setPending(null);
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
    <div className="min-h-screen bg-ud-surface-3">
      <header className="flex items-center justify-between px-5 sm:px-8 h-16 border-b border-ud-border bg-ud-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Image src="/images/uhasibu-digito-circle.png" alt="Uhasibu Digito" width={32} height={32} className="w-8 h-8 rounded-lg" priority />
          <span className="font-display font-bold">Uhasibu Digito</span>
        </div>
        <button onClick={() => void signOut()} className="inline-flex items-center gap-1.5 text-sm text-ud-text-muted hover:text-ud-text-primary transition-colors">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10 sm:py-14">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="text-center max-w-2xl mx-auto"
        >
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-balance">Choose the plan that fits your business</h1>
          <p className="mt-3 text-ud-text-secondary text-balance">
            Start with Point of Sale and upgrade any time as you grow into full accounting, tax and payroll.
          </p>
        </motion.div>

        {from && requiredTier && (
          <div className="mt-6 mx-auto max-w-2xl flex items-center gap-2.5 rounded-2xl border border-ud-warning/30 bg-ud-warning-bg px-4 py-3 text-sm text-ud-text-secondary">
            <Lock className="w-4 h-4 text-ud-warning flex-shrink-0" />
            <span>
              <strong className="font-semibold">{moduleLabel(from)}</strong> needs the{" "}
              <strong className="font-semibold capitalize">{requiredTier}</strong> plan or higher. Pick a plan below to unlock it.
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
                />
              ))}
        </div>

        <p className="mt-8 text-center text-xs text-ud-text-muted">
          Prices in Tanzanian Shillings (TZS), billed yearly. You can change your plan at any time from Settings.
        </p>
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
