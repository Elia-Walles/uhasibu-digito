"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, useReducedMotion } from "framer-motion";
import { Building2, User as UserIcon, LogOut, ArrowRight, ArrowLeft, WifiOff, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SearchableSelect, type SearchableOption } from "@/components/ui/SearchableSelect";
import { PhoneField } from "@/components/ui/PhoneField";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Steps } from "@/components/ui/Steps";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { FormSkeleton } from "@/components/skeletons/FormSkeleton";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { LocationPicker } from "@/components/onboarding/LocationPicker";
import { PricingCard } from "@/components/billing/PricingCard";
import { usePublicPlans } from "@/lib/hooks/usePublicPlans";
import { useSignOut } from "@/lib/auth/client";
import { getOnboardingDraft, saveOnboardingDraft, saveOnboardingProfile } from "@/lib/server/actions/auth";
import { createSubscriptionInvoice, submitSubscriptionInvoice, getMySubscriptionInvoice } from "@/lib/server/actions/billing";
import { SubscriptionInvoiceView } from "@/components/billing/SubscriptionInvoiceView";
import type { SubscriptionInvoiceView as Invoice } from "@/types/billing";
import { BUSINESS_TYPES, HEARD_FROM_SOURCES } from "@/lib/server/schemas/auth";
import { fetchCountries, fetchRegions, fetchCities, type GeoCountry } from "@/lib/geo/geo-api";
import { TZ_REGION_NAMES, districtsForRegion } from "@/lib/geo/tz-locations";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { normalizeTier, type Tier } from "@/lib/auth/tiers";
import { useT } from "@/lib/hooks/useT";
import toast from "react-hot-toast";

// The pickers add their own "Other" escape hatch, so drop the literal "Other" from the base lists.
const BUSINESS_TYPE_OPTIONS = BUSINESS_TYPES.filter((b) => b !== "Other");
const HEARD_FROM_OPTIONS = HEARD_FROM_SOURCES.filter((s) => s !== "Other");

const fieldVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

function OnboardingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session, update } = useSession();
  const signOut = useSignOut();
  const t = useT();
  const reduce = useReducedMotion();
  const online = useOnlineStatus();
  const { plans, loading } = usePublicPlans();

  const from = params.get("from");
  const currentTier = normalizeTier(session?.user?.tier);

  const [step, setStep] = useState(0);
  const [savingProfile, setSavingProfile] = useState(false);
  const [pending, setPending] = useState<Tier | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);

  // Step 1 business information.
  const [name, setName] = useState(session?.user?.name ?? "");
  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [countryCode, setCountryCode] = useState("TZ"); // ISO-2 (Tanzania by default)
  const [country, setCountry] = useState("Tanzania"); // display name
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");
  const [street, setStreet] = useState("");
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [heardFrom, setHeardFrom] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("");

  // Live geo data.
  const [countries, setCountries] = useState<GeoCountry[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [regions, setRegions] = useState<string[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [districts, setDistricts] = useState<string[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);

  const isTZ = countryCode === "TZ";

  const [draftLoading, setDraftLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const hydratedRef = useRef(false);
  const lastSavedRef = useRef("");

  // Load the country list + resume any saved draft.
  useEffect(() => {
    const controller = new AbortController();
    fetchCountries(controller.signal)
      .then(setCountries)
      .catch(() => {})
      .finally(() => setCountriesLoading(false));

    Promise.all([getOnboardingDraft(), getMySubscriptionInvoice()])
      .then(([draftRes, invoiceRes]) => {
        // Check for unpaid invoice first — if one exists, jump to payment step.
        if (invoiceRes.ok && invoiceRes.data && invoiceRes.data.status === "unpaid") {
          setInvoice(invoiceRes.data);
          setStep(2);
        } else if (draftRes.ok) {
          // No unpaid invoice; restore the draft and check if business info is complete.
          const d = draftRes.data;
          setName(d.name ?? session?.user?.name ?? "");
          setCompanyName(d.companyName ?? "");
          setBusinessType(d.businessType ?? "");
          setCountryCode(d.countryCode || "TZ");
          setCountry(d.country || "Tanzania");
          setRegion(d.region ?? "");
          setDistrict(d.district ?? "");
          setStreet(d.street ?? "");
          setLatitude(d.latitude);
          setLongitude(d.longitude);
          setHeardFrom(d.heardFrom ?? "");
          setPhone(d.phone ?? "");
          setPhoneCountryCode(d.phoneCountryCode ?? "");

          // Resume at the first unfinished stage: if the business information was already saved,
          // skip straight to the plan step so a reload doesn't send the user back through step 1.
          const businessComplete = Boolean(
            (d.name ?? session?.user?.name ?? "").trim() &&
              (d.companyName ?? "").trim() &&
              (d.region ?? "").trim() &&
              (d.district ?? "").trim() &&
              (d.businessType ?? "").trim(),
          );
          if (businessComplete) setStep(1);
        }
      })
      .finally(() => setDraftLoading(false));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cascade 1: load the selected country's regions. Tanzania uses the bundled TAMISEMI list
  // (complete + consistent); other countries fall back to the live countriesnow states.
  useEffect(() => {
    if (!country) {
      setRegions([]);
      return;
    }
    if (isTZ) {
      setRegions(TZ_REGION_NAMES);
      setRegionsLoading(false);
      return;
    }
    const controller = new AbortController();
    setRegionsLoading(true);
    fetchRegions(country, controller.signal)
      .then(setRegions)
      .catch(() => setRegions([]))
      .finally(() => setRegionsLoading(false));
    return () => controller.abort();
  }, [country, isTZ]);

  // Cascade 2: load the selected region's districts/councils. Tanzania uses the bundled councils;
  // other countries fall back to the live cities API.
  useEffect(() => {
    if (!region) {
      setDistricts([]);
      return;
    }
    if (isTZ) {
      setDistricts(districtsForRegion(region));
      setDistrictsLoading(false);
      return;
    }
    const controller = new AbortController();
    setDistrictsLoading(true);
    fetchCities(country, region, controller.signal)
      .then(setDistricts)
      .catch(() => setDistricts([]))
      .finally(() => setDistrictsLoading(false));
    return () => controller.abort();
  }, [region, country, isTZ]);

  // Debounced DB autosave — persists partial progress so the user can resume later.
  const snapshot = useMemo(
    () => ({
      name, companyName, businessType, country, countryCode, region, district, street,
      ...(latitude != null ? { latitude } : {}),
      ...(longitude != null ? { longitude } : {}),
      heardFrom, phone, phoneCountryCode,
    }),
    [name, companyName, businessType, country, countryCode, region, district, street, latitude, longitude, heardFrom, phone, phoneCountryCode],
  );
  const debouncedSnapshot = useDebounce(JSON.stringify(snapshot), 800);

  useEffect(() => {
    if (draftLoading) return;
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      lastSavedRef.current = debouncedSnapshot; // baseline — don't re-save the hydrated values
      return;
    }
    if (debouncedSnapshot === lastSavedRef.current) return;
    lastSavedRef.current = debouncedSnapshot;
    setSaveState("saving");
    saveOnboardingDraft(JSON.parse(debouncedSnapshot))
      .then(() => setSaveState("saved"))
      .catch(() => setSaveState("idle"));
  }, [debouncedSnapshot, draftLoading]);

  const countryOptions: SearchableOption[] = useMemo(
    () =>
      countries.map((c) => ({
        value: c.iso2,
        label: c.name,
        leading: <CountryFlag code={c.iso2} className="w-5 h-3.5 shrink-0" />,
      })),
    [countries],
  );

  function onCountryChange(iso2: string) {
    setCountryCode(iso2);
    setCountry(countries.find((c) => c.iso2 === iso2)?.name ?? iso2);
    setRegion("");
    setDistrict("");
    setStreet("");
    setLatitude(undefined);
    setLongitude(undefined);
  }

  function onRegionChange(r: string) {
    setRegion(r);
    setDistrict("");
  }

  // Required business-info fields drive the progress bar.
  const requiredFilled = [name, companyName, countryCode, region, district, businessType].filter(Boolean).length;
  const progress = Math.round((requiredFilled / 6) * 100);
  const canSubmit =
    online && !!name && !!companyName && !!countryCode && !!country && !!region && !!district && !!businessType;

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSavingProfile(true);
    try {
      const res = await saveOnboardingProfile({
        name,
        companyName,
        businessType,
        country,
        countryCode,
        region,
        district,
        ...(street ? { street } : {}),
        ...(latitude != null ? { latitude } : {}),
        ...(longitude != null ? { longitude } : {}),
        ...(heardFrom ? { heardFrom } : {}),
        ...(phone ? { phone } : {}),
        ...(phoneCountryCode ? { phoneCountryCode } : {}),
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
      const res = await createSubscriptionInvoice({ planKey: tier });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setInvoice(res.data);
      setStep(2);
    } finally {
      setPending(null);
    }
  }

  async function onDoneInvoice() {
    if (!invoice) return;
    setSubmittingInvoice(true);
    try {
      const res = await submitSubscriptionInvoice({ invoiceId: invoice.id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      await update(); // refresh session so the pending-approval gate applies
      toast.success(t("Invoice sent. We'll activate your account once payment is confirmed."));
      router.push("/pending-approval");
    } finally {
      setSubmittingInvoice(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-ud-surface-3 overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-ud-primary opacity-10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-ud-gold opacity-10 blur-3xl" />

      <header className="relative flex items-center justify-between px-5 sm:px-8 lg:px-12 h-16 border-b border-ud-border bg-ud-surface/80 backdrop-blur-md">
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

      <main className="relative w-full px-5 sm:px-8 lg:px-12 py-6 sm:py-10">
        <div className="max-w-md mx-auto">
          <Steps
            steps={[
              { label: t("Business information") },
              { label: t("Choose a plan") },
              { label: t("Payment") },
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
            className="mt-8 max-w-6xl mx-auto"
          >
            <div className="text-center">
              <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-balance">{t("Tell us about your business")}</h1>
            </div>

            {/* Progress + autosave status */}
            <div className="mt-5 flex items-center gap-3 max-w-2xl mx-auto">
              <ProgressBar value={progress} className="flex-1" />
              <span className="text-xs tabular-nums text-ud-text-muted w-9 text-right">{progress}%</span>
              <span className="w-16 text-xs text-ud-text-muted flex items-center gap-1 justify-end" role="status">
                {saveState === "saving" && (<><Loader2 className="w-3 h-3 animate-spin" /> {t("Saving…")}</>)}
                {saveState === "saved" && (
                  <motion.span
                    initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-1 text-ud-success"
                  >
                    <Check className="w-3 h-3" /> {t("Saved")}
                  </motion.span>
                )}
              </span>
            </div>

            {!online ? (
              <div className="mt-6 rounded-3xl border border-ud-border bg-ud-surface shadow-card p-8 text-center">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-ud-warning-bg flex items-center justify-center">
                  <WifiOff className="w-7 h-7 text-ud-warning" />
                </div>
                <h2 className="mt-4 font-display font-bold text-lg text-ud-text-primary">{t("You're offline")}</h2>
                <p className="mt-1.5 text-sm text-ud-text-muted text-balance">
                  {t("Onboarding needs an internet connection to look up your country, district and location. We'll continue automatically once you're back online.")}
                </p>
              </div>
            ) : draftLoading ? (
              <div className="mt-6"><FormSkeleton fields={6} /></div>
            ) : (
              <motion.form
                onSubmit={onSaveProfile}
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.05 } } }}
                className="mt-5 rounded-3xl border border-ud-border bg-ud-surface shadow-card p-6 sm:p-8"
              >
                <div className="grid lg:grid-cols-2 gap-x-8 gap-y-5">
                  {/* Left: business details */}
                  <div className="grid sm:grid-cols-2 gap-x-4 gap-y-3 content-start">
                    <motion.div variants={fieldVariants}>
                      <Input label={t("Full name")} value={name} onChange={(e) => setName(e.target.value)} prefixIcon={<UserIcon className="w-4 h-4" />} autoComplete="name" required />
                    </motion.div>
                    <motion.div variants={fieldVariants}>
                      <Input label={t("Company / Business name")} value={companyName} onChange={(e) => setCompanyName(e.target.value)} prefixIcon={<Building2 className="w-4 h-4" />} autoComplete="organization" required />
                    </motion.div>
                    <motion.div variants={fieldVariants}>
                      <SearchableSelect
                        label={t("Country")}
                        value={countryCode}
                        onValueChange={onCountryChange}
                        placeholder={t("Select country")}
                        searchPlaceholder={t("Search country")}
                        options={countryOptions}
                        loading={countriesLoading}
                      />
                    </motion.div>
                    <motion.div variants={fieldVariants}>
                      <SearchableSelect
                        label={t("Region")}
                        value={region}
                        onValueChange={onRegionChange}
                        placeholder={countryCode ? t("Select region") : t("Select country first")}
                        searchPlaceholder={t("Search region")}
                        options={regions.map((r) => ({ value: r, label: r }))}
                        loading={regionsLoading}
                        disabled={!countryCode}
                        allowOther
                      />
                    </motion.div>
                    <motion.div variants={fieldVariants}>
                      <SearchableSelect
                        label={t("District")}
                        value={district}
                        onValueChange={setDistrict}
                        placeholder={region ? t("Select district") : t("Select region first")}
                        searchPlaceholder={t("Search district")}
                        options={districts.map((d) => ({ value: d, label: d }))}
                        loading={districtsLoading}
                        disabled={!region}
                        allowOther
                      />
                    </motion.div>
                    <motion.div variants={fieldVariants}>
                      <SearchableSelect
                        label={t("Business type")}
                        value={businessType}
                        onValueChange={setBusinessType}
                        placeholder={t("Select type")}
                        searchPlaceholder={t("Search business type")}
                        options={BUSINESS_TYPE_OPTIONS.map((bt) => ({ value: bt, label: bt }))}
                        allowOther
                      />
                    </motion.div>
                    <motion.div variants={fieldVariants} className="sm:col-span-2">
                      <SearchableSelect
                        label={t("Where did you hear about us?")}
                        value={heardFrom}
                        onValueChange={setHeardFrom}
                        placeholder={t("Select an option")}
                        searchPlaceholder={t("Search")}
                        options={HEARD_FROM_OPTIONS.map((s) => ({ value: s, label: s }))}
                        allowOther
                      />
                    </motion.div>
                    <motion.div variants={fieldVariants} className="sm:col-span-2">
                      <PhoneField
                        label={t("Phone number")}
                        value={phone}
                        countries={countries}
                        defaultCountry={countryCode || "TZ"}
                        onChange={(v) => {
                          setPhone(v.phone);
                          setPhoneCountryCode(v.phoneCountryCode);
                        }}
                      />
                    </motion.div>
                  </div>

                  {/* Right: location / map */}
                  <motion.div variants={fieldVariants}>
                    <LocationPicker
                      label={t("Location / street")}
                      {...(countryCode ? { countryCode } : {})}
                      country={country}
                      {...(region ? { region } : {})}
                      {...(district ? { district } : {})}
                      value={{ ...(latitude != null ? { lat: latitude } : {}), ...(longitude != null ? { lng: longitude } : {}), street }}
                      onChange={(v) => {
                        setLatitude(v.lat);
                        setLongitude(v.lng);
                        setStreet(v.street ?? "");
                      }}
                    />
                  </motion.div>
                </div>

                <motion.div variants={fieldVariants} className="mt-6">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={savingProfile}
                    disabled={!canSubmit}
                    fullWidth
                    icon={!savingProfile ? <ArrowRight className="w-4 h-4" /> : undefined}
                  >
                    {savingProfile ? t("Saving…") : t("Continue to plans")}
                  </Button>
                </motion.div>
              </motion.form>
            )}
          </motion.div>
        ) : step === 1 ? (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-10"
          >
            <div className="grid gap-5 xl:gap-6 sm:grid-cols-2 lg:grid-cols-4 items-start">
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
        ) : (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-8 max-w-2xl mx-auto"
          >
            <div className="text-center mb-6">
              <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-balance">{t("Complete your payment")}</h1>
              <p className="mt-2 text-sm text-ud-text-muted text-balance">
                {t("Pay this invoice by bank transfer, then click Done. We'll activate your account once payment is confirmed.")}
              </p>
            </div>
            {invoice && (
              <SubscriptionInvoiceView
                invoice={invoice}
                submitting={submittingInvoice}
                onDone={() => void onDoneInvoice()}
                onBack={() => setStep(1)}
              />
            )}
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
