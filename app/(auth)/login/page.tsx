"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Mail, Lock, ShieldCheck, Sparkles, TrendingUp, FileBarChart,
  Eye, EyeOff, ArrowLeft, ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { useT } from "@/lib/hooks/useT";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";

const FEATURES = [
  { icon: TrendingUp, label: "Live KPIs" },
  { icon: ShieldCheck, label: "NBAA Stamp" },
  { icon: FileBarChart, label: "Statements" },
  { icon: Sparkles, label: "AI Insights" },
];

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        toast.error(t("Invalid email or password"));
        return;
      }
      toast.success(t("Welcome back"));
      router.push("/dashboard");
    } catch {
      toast.error(t("Could not sign in"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* LEFT: brand showcase */}
      <AuthBrandPanel
        headline={t("The financial platform built for Tanzania.")}
        subcopy={t("Twenty modules in one place: real-time insight from general ledger to payroll, TRA compliance to a smart AI assistant.")}
        features={FEATURES.map((f) => ({ ...f, label: t(f.label) }))}
      />

      {/* RIGHT: sign-in form */}
      <div className="relative flex flex-col justify-center p-6 sm:p-10 lg:p-16 bg-ud-surface">
        {/* faint top accent */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ud-primary-50/60 to-transparent" />

        <div className="absolute top-5 right-5 flex items-center gap-2">
          <LanguageSwitcher />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ud-text-muted hover:text-ud-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {t("Back to home")}
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative w-full max-w-sm mx-auto"
        >
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <Image
              src="/images/uhasibu-digito-circle.png"
              alt="Uhasibu Digito"
              width={40}
              height={40}
              className="w-10 h-10 rounded-xl"
            />
            <div className="font-display font-bold text-base">Uhasibu Digito</div>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-ud-primary-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ud-primary">
            <Lock className="w-3 h-3" /> {t("Secure sign in")}
          </div>
          <h1 className="mt-4 font-display text-3xl font-extrabold text-ud-text-primary">{t("Welcome back")}</h1>
          <p className="mt-1.5 text-sm text-ud-text-muted">{t("Sign in to continue to your dashboard.")}</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <Input
              label={t("Email address")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.co.tz"
              prefixIcon={<Mail className="w-4 h-4" />}
              autoComplete="email"
              required
            />
            <div>
              <Input
                label={t("Password")}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                prefixIcon={<Lock className="w-4 h-4" />}
                autoComplete="current-password"
                suffixIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-ud-text-muted hover:text-ud-text-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-primary rounded"
                    aria-label={showPassword ? t("Hide password") : t("Show password")}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />
              <div className="mt-1.5 text-right">
                <Link href="/forgot-password" className="text-xs font-medium text-ud-primary hover:underline">
                  {t("Forgot password?")}
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              fullWidth
              icon={!loading ? <ArrowRight className="w-4 h-4" /> : undefined}
            >
              {loading ? t("Signing in…") : t("Sign in")}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-ud-text-faint">
            <span className="h-px flex-1 bg-ud-border" />
            {t("New to Uhasibu Digito?")}
            <span className="h-px flex-1 bg-ud-border" />
          </div>

          <Link href="/register">
            <Button variant="outline" size="lg" fullWidth>
              {t("Create an account")}
            </Button>
          </Link>

          <p className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-ud-text-faint">
            <ShieldCheck className="w-3.5 h-3.5" /> {t("Protected with bank-grade encryption")}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
