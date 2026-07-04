"use client";
import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Mail, ArrowLeft, ArrowRight, MailCheck, KeyRound, ShieldCheck, Clock } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { useT } from "@/lib/hooks/useT";
import { requestPasswordReset } from "@/lib/server/actions/auth";
import toast from "react-hot-toast";

const FEATURES = [
  { icon: ShieldCheck, label: "Secure reset link" },
  { icon: Clock, label: "Expires in 1 hour" },
];

export default function ForgotPasswordPage() {
  const t = useT();
  const reduce = useReducedMotion();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await requestPasswordReset({ email });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDevLink(res.data.devLink ?? "");
      setSent(true);
    } catch {
      toast.error(t("Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <AuthBrandPanel
        headline={t("Forgot your password? It happens.")}
        subcopy={t("Enter your email and we'll send a secure link to set a new one. Your data stays safe the whole time.")}
        features={FEATURES.map((f) => ({ ...f, label: t(f.label) }))}
      />

      <div className="relative flex flex-col justify-center p-6 sm:p-10 lg:p-14 bg-ud-surface-2 overflow-hidden">
        {/* ambient accents */}
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-ud-primary opacity-[0.07] blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-20 w-80 h-80 rounded-full bg-ud-gold opacity-[0.05] blur-3xl" />

        <div className="absolute top-5 right-5 z-20 flex items-center gap-2">
          <LanguageSwitcher />
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ud-text-muted hover:text-ud-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {t("Back to sign in")}
          </Link>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={reduce ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative z-10 w-full max-w-md mx-auto"
        >
          <div className="rounded-3xl border border-ud-border bg-ud-surface shadow-elevated p-7 sm:p-9">
            {sent ? (
              <div className="text-center">
                <motion.div
                  initial={reduce ? false : { opacity: 0, scale: 0.85 }}
                  animate={reduce ? {} : { opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 280, damping: 18 }}
                  className="mx-auto w-16 h-16 rounded-2xl bg-ud-success-bg flex items-center justify-center"
                >
                  <MailCheck className="w-8 h-8 text-ud-success" />
                </motion.div>
                <h1 className="mt-5 font-display text-2xl font-extrabold text-ud-text-primary">{t("Check your inbox")}</h1>
                <p className="mt-2 text-sm text-ud-text-secondary leading-relaxed">
                  {t("If an account exists for {email}, a reset link is on its way. Check your inbox (and spam). The link expires in one hour.", { email })}
                </p>

                {devLink && (
                  <div className="mt-5 rounded-2xl border border-ud-warning/30 bg-ud-warning-bg px-4 py-3 text-left">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ud-warning">{t("Development mode email not configured")}</p>
                    <p className="mt-1 text-xs text-ud-text-secondary">{t("Open this link to reset your password:")}</p>
                    <a href={devLink} className="mt-1.5 block break-all text-xs font-medium text-ud-primary hover:underline">{devLink}</a>
                  </div>
                )}

                <Link href="/login" className="inline-block mt-6">
                  <Button variant="outline" size="lg">{t("Back to sign in")}</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-ud-primary-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ud-primary">
                  <KeyRound className="w-3 h-3" /> {t("Password recovery")}
                </div>
                <h1 className="mt-4 font-display text-3xl font-extrabold text-ud-text-primary">{t("Reset your password")}</h1>
                <p className="mt-1.5 text-sm text-ud-text-muted">{t("We'll email you a secure reset link.")}</p>

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
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    fullWidth
                    icon={!loading ? <ArrowRight className="w-4 h-4" /> : undefined}
                  >
                    {loading ? t("Sending…") : t("Send reset link")}
                  </Button>
                </form>

                <div className="mt-6 text-sm text-ud-text-muted text-center">
                  {t("Remembered it?")} <Link href="/login" className="text-ud-primary font-medium hover:underline">{t("Sign in")}</Link>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
