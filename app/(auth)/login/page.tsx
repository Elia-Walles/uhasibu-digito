"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import {
  Mail, Lock, ShieldCheck, Sparkles, TrendingUp, FileBarChart,
  Eye, EyeOff, ArrowLeft, ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { useT } from "@/lib/hooks/useT";
import { signIn } from "next-auth/react";
import { getVerificationState, resendVerification } from "@/lib/server/actions/auth";
import { MailWarning } from "lucide-react";
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
  const reduce = useReducedMotion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setNeedsVerification(false);
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        // A correct password on an unverified account is rejected too surface a clearer prompt.
        const state = await getVerificationState({ email });
        if (state === "unverified") {
          setNeedsVerification(true);
          toast.error(t("Please verify your email to sign in"));
        } else {
          toast.error(t("Invalid email or password"));
        }
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

  async function onResend() {
    setResending(true);
    try {
      const res = await resendVerification({ email });
      if (res.ok) {
        toast.success(t("Verification email sent"));
        router.push(`/verify-email?email=${encodeURIComponent(email)}${res.data.devLink ? `&devLink=${encodeURIComponent(res.data.devLink)}` : ""}`);
      } else {
        toast.error(res.error);
      }
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* LEFT: brand showcase */}
      <AuthBrandPanel
        headline={t("The financial platform built for Tanzania.")}
        subcopy={t("Twenty modules in one place: real-time insight from general ledger to payroll, TRA compliance to a smart AI assistant.")}
        features={FEATURES.map((f) => ({ ...f, label: t(f.label) }))}
      />

      {/* RIGHT: sign-in form */}
      <div className="relative flex flex-col justify-center p-6 sm:p-10 lg:p-14 bg-ud-surface-2 overflow-hidden">
        {/* ambient accents */}
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-ud-primary opacity-[0.06] blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-20 w-80 h-80 rounded-full bg-ud-gold opacity-[0.04] blur-3xl" />

        <div className="absolute top-5 right-5 z-20 flex items-center gap-2">
          <LanguageSwitcher />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ud-text-muted hover:text-ud-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {t("Back to home")}
          </Link>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={reduce ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative z-10 w-full max-w-md mx-auto"
        >
          <div className="lg:hidden mb-6 flex items-center justify-center gap-3">
            <Image
              src="/images/uhasibu-digito-circle.png"
              alt="Uhasibu Digito"
              width={40}
              height={40}
              className="w-10 h-10 rounded-xl"
            />
            <div className="font-display font-bold text-base">Uhasibu Digito</div>
          </div>

          <div className="rounded-3xl border border-ud-border bg-ud-surface shadow-elevated p-8 sm:p-9">
            <h1 className="font-display text-3xl font-extrabold text-ud-text-primary">{t("Welcome back")}</h1>
            <p className="mt-1.5 text-sm text-ud-text-muted">{t("Sign in to your account")}</p>

            {needsVerification && (
              <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-ud-warning/30 bg-ud-warning-bg px-4 py-3 text-sm text-ud-text-secondary">
                <MailWarning className="w-4 h-4 text-ud-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-ud-text-primary">{t("Verify your email first")}</p>
                  <p className="mt-0.5">{t("Your account isn't verified yet. Check your inbox, or")}{" "}
                    <button
                      type="button"
                      onClick={() => void onResend()}
                      disabled={resending}
                      className="font-semibold text-ud-primary hover:underline disabled:opacity-50"
                    >
                      {resending ? t("sending…") : t("resend the link")}
                    </button>.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-7 space-y-4">
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
              {t("or")}
              <span className="h-px flex-1 bg-ud-border" />
            </div>

            <GoogleAuthButton label={t("Continue with Google")} />

            <p className="mt-7 text-center text-sm text-ud-text-muted">
              {t("New to Uhasibu Digito?")}{" "}
              <Link href="/register" className="font-semibold text-ud-primary hover:underline">
                {t("Create an account")}
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
