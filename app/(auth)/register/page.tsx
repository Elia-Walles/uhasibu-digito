"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Mail, Lock, User as UserIcon, Building2, Phone, MapPin,
  Eye, EyeOff, ArrowLeft, ArrowRight, ShoppingCart, BookOpen, Wallet, Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { signIn } from "next-auth/react";
import { registerTenant } from "@/lib/server/actions/auth";
import { BUSINESS_TYPES } from "@/lib/server/schemas/auth";
import toast from "react-hot-toast";

const TZ_REGIONS = [
  "Dar es Salaam", "Arusha", "Mwanza", "Dodoma", "Mbeya", "Morogoro", "Tanga",
  "Kilimanjaro", "Zanzibar", "Geita", "Kagera", "Tabora", "Other",
];

const FEATURES = [
  { icon: ShoppingCart, label: "Point of Sale" },
  { icon: BookOpen, label: "Accounting" },
  { icon: Wallet, label: "Payroll & Tax" },
  { icon: Sparkles, label: "AI Assistant" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [region, setRegion] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await registerTenant({
        name,
        companyName,
        email,
        password,
        businessType: businessType as (typeof BUSINESS_TYPES)[number],
        region,
        ...(phone ? { phone } : {}),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const signInRes = await signIn("credentials", { email, password, redirect: false });
      if (signInRes?.error) {
        toast.success("Account created please sign in");
        router.push("/login");
        return;
      }
      // Carry a plan picked on the public pricing page (/register?plan=key) into onboarding,
      // where it is auto-activated. Only forward a known plan key.
      const picked = new URLSearchParams(window.location.search).get("plan");
      const validPlan = ["starter", "business", "standard", "premium"].includes(picked ?? "") ? picked : null;
      toast.success("Account created. Choose your plan to get started.");
      router.push(validPlan ? `/select-plan?plan=${validPlan}` : "/select-plan");
    } catch {
      toast.error("Could not create your account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      <AuthBrandPanel
        headline="Run your shop and your books from one place."
        subcopy="Start with Point of Sale, then grow into full Tanzanian-ready accounting, tax and payroll, all on Uhasibu Digito."
        features={FEATURES}
      />

      <div className="relative flex flex-col justify-center p-6 sm:p-10 lg:p-16 bg-ud-surface">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ud-primary-50/60 to-transparent" />

        <Link
          href="/"
          className="absolute top-5 right-5 inline-flex items-center gap-1.5 text-xs font-medium text-ud-text-muted hover:text-ud-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative w-full max-w-md mx-auto"
        >
          <div className="inline-flex items-center gap-1.5 rounded-full bg-ud-primary-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ud-primary">
            <Sparkles className="w-3 h-3" /> Get started free
          </div>
          <h1 className="mt-4 font-display text-3xl font-extrabold text-ud-text-primary">Create your account</h1>
          <p className="mt-1.5 text-sm text-ud-text-muted">Set up your company in a couple of minutes.</p>

          <form onSubmit={onSubmit} className="mt-7 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Full name"    value={name}        onChange={(e) => setName(e.target.value)}        prefixIcon={<UserIcon className="w-4 h-4" />} autoComplete="name" required />
              <Input label="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} prefixIcon={<Building2 className="w-4 h-4" />} autoComplete="organization" required />
            </div>
            <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@company.co.tz" prefixIcon={<Mail className="w-4 h-4" />} autoComplete="email" required />
            <div className="grid sm:grid-cols-2 gap-3">
              <Select
                label="Business type"
                value={businessType}
                onValueChange={setBusinessType}
                placeholder="Select type"
                options={BUSINESS_TYPES.map((t) => ({ value: t, label: t }))}
              />
              <Select
                label="Region"
                value={region}
                onValueChange={setRegion}
                placeholder="Select region"
                options={TZ_REGIONS.map((r) => ({ value: r, label: r }))}
              />
            </div>
            <Input label="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+255 712 345 678" prefixIcon={<Phone className="w-4 h-4" />} autoComplete="tel" />
            <Input
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              prefixIcon={<Lock className="w-4 h-4" />}
              autoComplete="new-password"
              suffixIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-ud-text-muted hover:text-ud-text-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-primary rounded"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              fullWidth
              icon={!loading ? <ArrowRight className="w-4 h-4" /> : undefined}
            >
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-ud-text-faint">
            <MapPin className="w-3 h-3" /> Tanzania-ready · TZS · TRA compliant
          </div>
          <div className="mt-4 text-sm text-ud-text-muted text-center">
            Already have an account? <Link href="/login" className="text-ud-primary font-medium hover:underline">Sign in</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
