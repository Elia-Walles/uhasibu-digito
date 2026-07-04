"use client";
import { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Building2, User as UserIcon, Phone, LogOut, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Steps } from "@/components/ui/Steps";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { PricingCard } from "@/components/billing/PricingCard";
import { usePublicPlans } from "@/lib/hooks/usePublicPlans";
import { useSignOut } from "@/lib/auth/client";
import { saveOnboardingProfile } from "@/lib/server/actions/auth";
import { selectPlan } from "@/lib/server/actions/billing";
import { BUSINESS_TYPES } from "@/lib/server/schemas/auth";
import { normalizeTier, type Tier } from "@/lib/auth/tiers";
import { useT } from "@/lib/hooks/useT";
import toast from "react-hot-toast";

const TZ_REGIONS = [
  "Dar es Salaam", "Arusha", "Mwanza", "Dodoma", "Mbeya", "Morogoro", "Tanga",
  "Kilimanjaro", "Zanzibar", "Geita", "Kagera", "Tabora", "Other",
];

function OnboardingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session, update } = useSession();
  const signOut = useSignOut();
  const t = useT();
  const { plans, loading } = usePublicPlans();

  const from = params.get("from");
  const currentTier = normalizeTier(session?.user?.tier);

  const [step, setStep] = useState(0);
  const [savingProfile, setSavingProfile] = useState(false);
  const [pending, setPending] = useState<Tier | null>(null);

  // Step 1 business essentials.
  const [name, setName] = useState(session?.user?.name ?? "");
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [region, setRegion] = useState("");
  const [phone, setPhone] = useState("");

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await saveOnboardingProfile({
        name,
        companyName,
        businessType: businessType as (typeof BUSINESS_TYPES)[number],
        region,
        ...(phone ? { phone } : {}),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      await update(); // refresh the display name into the session
      setStep(1);
    } finally {
      setSavingProfile(false);
    }
  }

  async function choosePlan(tier: Exclude<Tier, "free">) {
    setPending(tier);
    try {
      const res = await selectPlan({ tier });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      await update(); // re-reads the new tier into the JWT
      toast.success(t("You're all set. Welcome to Uhasibu Digito!"));
      router.push(from ?? "/dashboard");
    } finally {
      setPending(null);
    }
  }

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

      <main className="relative max-w-5xl mx-auto px-4 sm:px-8 py-10 sm:py-14">
        <div className="max-w-md mx-auto">
          <Steps
            steps={[
              { label: t("Business information") },
              { label: t("Choose a plan") },
            ]}
            current={step}
          />
        </div>

        {step === 0 ? (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-10 max-w-lg mx-auto"
          >
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-ud-primary-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ud-primary">
                <Sparkles className="w-3 h-3" /> {t("Complete your registration")}
              </div>
              <h1 className="mt-4 font-display font-extrabold text-3xl text-balance">{t("Tell us about your business")}</h1>
              <p className="mt-2 text-ud-text-secondary text-balance">{t("A few details set up your company you can refine everything later in Settings.")}</p>
            </div>

            <form onSubmit={onSaveProfile} className="mt-8 rounded-3xl border border-ud-border bg-ud-surface shadow-card p-6 sm:p-8 space-y-3">
              <Input label={t("Full name")} value={name} onChange={(e) => setName(e.target.value)} prefixIcon={<UserIcon className="w-4 h-4" />} autoComplete="name" required />
              <Input label={t("Company name")} value={companyName} onChange={(e) => setCompanyName(e.target.value)} prefixIcon={<Building2 className="w-4 h-4" />} autoComplete="organization" required />
              <div className="grid sm:grid-cols-2 gap-3">
                <Select
                  label={t("Business type")}
                  value={businessType}
                  onValueChange={setBusinessType}
                  placeholder={t("Select type")}
                  options={BUSINESS_TYPES.map((bt) => ({ value: bt, label: bt }))}
                />
                <Select
                  label={t("Region")}
                  value={region}
                  onValueChange={setRegion}
                  placeholder={t("Select region")}
                  options={TZ_REGIONS.map((r) => ({ value: r, label: r }))}
                />
              </div>
              <Input label={t("Phone (optional)")} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+255 712 345 678" prefixIcon={<Phone className="w-4 h-4" />} autoComplete="tel" />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={savingProfile}
                fullWidth
                icon={!savingProfile ? <ArrowRight className="w-4 h-4" /> : undefined}
              >
                {savingProfile ? t("Saving…") : t("Continue to plans")}
              </Button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-10"
          >
            <div className="text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-ud-primary-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ud-primary">
                <Sparkles className="w-3 h-3" /> {t("Choose your plan")}
              </div>
              <h1 className="mt-4 font-display font-extrabold text-3xl sm:text-4xl text-balance">{t("Choose the plan that fits your business")}</h1>
              <p className="mt-3 text-ud-text-secondary text-balance">
                {t("Start with Point of Sale and upgrade any time as you grow into full accounting, tax and payroll.")}
              </p>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 items-start">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} className="h-96" />)
                : plans.map((plan) => (
                    <PricingCard
                      key={plan.id}
                      plan={plan}
                      isCurrent={currentTier === plan.id}
                      loading={pending === plan.id}
                      onSelect={() => void choosePlan(plan.id)}
                    />
                  ))}
            </div>

            <div className="mt-8 flex items-center justify-center">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="inline-flex items-center gap-1.5 text-sm text-ud-text-muted hover:text-ud-text-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> {t("Back to business information")}
              </button>
            </div>
            <p className="mt-4 text-center text-xs text-ud-text-muted">
              {t("Prices in Tanzanian Shillings (TZS), billed yearly. You can change your plan at any time from Settings.")}
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ud-surface-3" />}>
      <OnboardingInner />
    </Suspense>
  );
}
