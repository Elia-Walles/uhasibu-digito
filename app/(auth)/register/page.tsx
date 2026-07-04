"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Mail, Lock, MapPin, Eye, EyeOff, ArrowLeft, ArrowRight,
  ShoppingCart, BookOpen, Wallet, Sparkles, Wand2,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PasswordChecklist } from "@/components/ui/PasswordChecklist";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { useT } from "@/lib/hooks/useT";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { registerCredentials, checkEmailAvailability } from "@/lib/server/actions/auth";
import { isStrongPassword, generateStrongPassword } from "@/lib/utils/password";
import toast from "react-hot-toast";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type EmailStatus = "idle" | "checking" | "available" | "taken";

const FEATURES = [
  { icon: ShoppingCart, label: "Point of Sale" },
  { icon: BookOpen, label: "Accounting" },
  { icon: Wallet, label: "Payroll & Tax" },
  { icon: Sparkles, label: "AI Assistant" },
];

export default function RegisterPage() {
  const router = useRouter();
  const t = useT();
  const reduce = useReducedMotion();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("idle");

  const debouncedEmail = useDebounce(email, 400);

  // Live availability check: once the debounced email is a plausible address, ask the server
  // whether it's free so a duplicate surfaces before submit. Guarded against out-of-order results.
  useEffect(() => {
    if (!EMAIL_RE.test(debouncedEmail)) {
      setEmailStatus("idle");
      return;
    }
    let cancelled = false;
    setEmailStatus("checking");
    checkEmailAvailability({ email: debouncedEmail })
      .then((res) => {
        if (!cancelled) setEmailStatus(res.available ? "available" : "taken");
      })
      .catch(() => {
        if (!cancelled) setEmailStatus("idle");
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedEmail]);

  const passwordValid = isStrongPassword(password);
  const confirmMismatch = confirm.length > 0 && confirm !== password;
  const canSubmit =
    EMAIL_RE.test(email) &&
    emailStatus !== "taken" &&
    emailStatus !== "checking" &&
    passwordValid &&
    password === confirm;

  const emailFeedback: { error?: string; hint?: string } =
    emailStatus === "taken"
      ? { error: t("This email is already registered") }
      : emailStatus === "checking"
        ? { hint: t("Checking availability…") }
        : emailStatus === "available"
          ? { hint: t("Email available") }
          : {};

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      const res = await registerCredentials({ email, password });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      // Email verification is required before sign-in send the user to the "check your inbox"
      // screen. In dev (no SMTP) the action returns the link so the flow stays testable.
      const params = new URLSearchParams({ email });
      if (res.data.devLink) params.set("devLink", res.data.devLink);
      toast.success(t("Account created check your email to verify"));
      router.push(`/verify-email?${params.toString()}`);
    } catch {
      toast.error(t("Could not create your account"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <AuthBrandPanel
        headline={t("Run your shop and your books from one place.")}
        subcopy={t("Start with Point of Sale, then grow into full Tanzanian-ready accounting, tax and payroll, all on Uhasibu Digito.")}
        features={FEATURES.map((f) => ({ ...f, label: t(f.label) }))}
      />

      <div className="relative flex flex-col justify-center p-6 sm:p-10 lg:p-14 bg-ud-surface-2 overflow-hidden">
        {/* ambient accents */}
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-ud-primary opacity-[0.07] blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-20 w-80 h-80 rounded-full bg-ud-gold opacity-[0.05] blur-3xl" />

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
          {/* Elevated form card */}
          <div className="rounded-3xl border border-ud-border bg-ud-surface shadow-elevated p-7 sm:p-9">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-ud-primary-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ud-primary">
              <Sparkles className="w-3 h-3" /> {t("Get started free")}
            </div>
            <h1 className="mt-4 font-display text-3xl font-extrabold text-ud-text-primary">{t("Create your account")}</h1>
            <p className="mt-1.5 text-sm text-ud-text-muted">{t("Sign up with your email you'll set up your company next.")}</p>

            <form onSubmit={onSubmit} className="mt-7 space-y-3">
              <Input
                label={t("Email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="you@company.co.tz"
                prefixIcon={<Mail className="w-4 h-4" />}
                autoComplete="email"
                required
                {...emailFeedback}
              />
              <div>
                <Input
                  label={t("Password")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
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
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const suggestion = generateStrongPassword();
                      setPassword(suggestion);
                      setConfirm(suggestion);
                      setShowPassword(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-ud-primary hover:text-ud-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-primary focus-visible:ring-offset-2 rounded"
                  >
                    <Wand2 className="w-3.5 h-3.5" /> {t("Suggest a strong password")}
                  </button>
                </div>
                <PasswordChecklist password={password} />
              </div>
              <Input
                label={t("Confirm password")}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                type={showPassword ? "text" : "password"}
                placeholder={t("Re-enter your password")}
                prefixIcon={<Lock className="w-4 h-4" />}
                autoComplete="new-password"
                required
                {...(confirmMismatch ? { error: t("Passwords do not match") } : {})}
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
                {loading ? t("Creating account…") : t("Create account")}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-ud-text-faint">
              <span className="h-px flex-1 bg-ud-border" />
              {t("or")}
              <span className="h-px flex-1 bg-ud-border" />
            </div>

            <GoogleAuthButton label={t("Continue with Google")} />
          </div>

          <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-ud-text-faint">
            <MapPin className="w-3 h-3" /> {t("Tanzania-ready · TZS · TRA compliant")}
          </div>
          <div className="mt-3 text-sm text-ud-text-muted text-center">
            {t("Already have an account?")} <Link href="/login" className="text-ud-primary font-medium hover:underline">{t("Sign in")}</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
