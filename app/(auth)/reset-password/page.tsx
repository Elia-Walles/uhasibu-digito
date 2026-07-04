"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Lock, Eye, EyeOff, ArrowLeft, ArrowRight, ShieldCheck, KeyRound, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PasswordChecklist } from "@/components/ui/PasswordChecklist";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { useT } from "@/lib/hooks/useT";
import { resetPassword } from "@/lib/server/actions/auth";
import { isStrongPassword } from "@/lib/utils/password";
import toast from "react-hot-toast";

const FEATURES = [
  { icon: ShieldCheck, label: "Encrypted at rest" },
  { icon: KeyRound, label: "Single-use link" },
];

function ResetForm() {
  const router = useRouter();
  const t = useT();
  const token = useSearchParams().get("token") ?? "";
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit = isStrongPassword(password) && password === confirm;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error(t("Passwords do not match"));
      return;
    }
    setLoading(true);
    try {
      const res = await resetPassword({ token, password });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("Password updated, please sign in"));
      router.push("/login");
    } catch {
      toast.error(t("Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-ud-warning-bg flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-ud-warning" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-extrabold text-ud-text-primary">{t("Link is incomplete")}</h1>
        <p className="mt-2 text-sm text-ud-text-secondary">{t("This reset link is missing its token. Request a new one.")}</p>
        <Link href="/forgot-password" className="inline-block mt-6">
          <Button variant="outline" size="lg">{t("Request a new link")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="inline-flex items-center gap-1.5 rounded-full bg-ud-primary-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ud-primary">
        <KeyRound className="w-3 h-3" /> {t("New password")}
      </div>
      <h1 className="mt-4 font-display text-3xl font-extrabold text-ud-text-primary">{t("Set a new password")}</h1>
      <p className="mt-1.5 text-sm text-ud-text-muted">{t("Choose a strong password you don't use elsewhere.")}</p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <Input
          label={t("New password")}
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("At least 8 characters")}
          prefixIcon={<Lock className="w-4 h-4" />}
          autoComplete="new-password"
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
        {password.length > 0 && <PasswordChecklist password={password} />}
        <Input
          label={t("Confirm password")}
          type={showPassword ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={t("Re-enter your password")}
          prefixIcon={<Lock className="w-4 h-4" />}
          autoComplete="new-password"
          required
          {...(confirm.length > 0 && confirm !== password ? { error: t("Passwords do not match") } : {})}
        />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          disabled={!canSubmit}
          fullWidth
          icon={!loading ? <ArrowRight className="w-4 h-4" /> : undefined}
        >
          {loading ? t("Updating…") : t("Update password")}
        </Button>
      </form>

      <div className="mt-6 text-sm text-ud-text-muted text-center">
        <Link href="/login" className="text-ud-primary font-medium hover:underline">{t("Back to sign in")}</Link>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  const t = useT();
  const reduce = useReducedMotion();
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <AuthBrandPanel
        headline={t("One step to secure access.")}
        subcopy={t("Set a fresh password and you're back in. Your reset link is single-use and encrypted end to end.")}
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
            <Suspense fallback={<p className="text-sm text-ud-text-muted">{t("Loading…")}</p>}>
              <ResetForm />
            </Suspense>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
