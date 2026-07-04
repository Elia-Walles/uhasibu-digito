"use client";
import { Suspense, useCallback, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, MailCheck, Inbox, ShieldCheck, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { useT } from "@/lib/hooks/useT";
import { verifyEmailCode, resendVerification } from "@/lib/server/actions/auth";
import toast from "react-hot-toast";

const FEATURES = [
  { icon: ShieldCheck, label: "Encrypted at rest" },
  { icon: KeyRound, label: "Single-use link" },
];

/** The post-signup path: /verify-email?email=… enter the code copied from the code page. */
function CheckInbox({ email, initialDevLink }: { email: string; initialDevLink: string }) {
  const t = useT();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [devLink, setDevLink] = useState(initialDevLink);

  const onVerify = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setVerifying(true);
      try {
        const res = await verifyEmailCode({ email, code });
        if (res.ok) {
          setVerified(true);
        } else {
          toast.error(res.error);
        }
      } finally {
        setVerifying(false);
      }
    },
    [email, code],
  );

  const resend = useCallback(async () => {
    setResending(true);
    try {
      const res = await resendVerification({ email });
      if (res.ok) {
        toast.success(t("Verification email sent"));
        if (res.data.devLink) setDevLink(res.data.devLink);
      } else {
        toast.error(res.error);
      }
    } finally {
      setResending(false);
    }
  }, [email, t]);

  if (verified) {
    return (
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-ud-success-bg flex items-center justify-center">
          <MailCheck className="w-8 h-8 text-ud-success" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-extrabold text-ud-text-primary">{t("Email verified")}</h1>
        <p className="mt-2 text-sm text-ud-text-secondary">{t("Your account is active. Sign in to set up your company.")}</p>
        <Link href="/login" className="inline-block mt-6">
          <Button variant="primary" size="lg" icon={<ArrowRight className="w-4 h-4" />}>{t("Continue to sign in")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-ud-primary-50 flex items-center justify-center">
          <Inbox className="w-8 h-8 text-ud-primary" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-extrabold text-ud-text-primary">{t("Check your inbox")}</h1>
        <p className="mt-2 text-sm text-ud-text-secondary">
          {t("We sent a verification link to")} {email ? <strong className="font-semibold text-ud-text-primary">{email}</strong> : t("your email")}.{" "}
          {t("Open it, tap “Get verification code”, then enter the 6-digit code below.")}
        </p>
      </div>

      {devLink && (
        <div className="mt-5 rounded-2xl border border-ud-warning/30 bg-ud-warning-bg px-4 py-3 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ud-warning">{t("Development mode email not configured")}</p>
          <a href={devLink} className="mt-1.5 block break-all text-xs font-medium text-ud-primary hover:underline">{devLink}</a>
        </div>
      )}

      <form onSubmit={onVerify} className="mt-6 space-y-4">
        <Input
          label={t("Verification code")}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          inputMode="numeric"
          autoComplete="one-time-code"
          className="text-center text-2xl font-mono tabular-nums tracking-[0.4em]"
          required
        />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={verifying}
          disabled={code.length !== 6}
          icon={!verifying ? <ArrowRight className="w-4 h-4" /> : undefined}
        >
          {verifying ? t("Verifying…") : t("Verify email")}
        </Button>
      </form>

      <div className="mt-5 flex items-center justify-center gap-1.5 text-sm text-ud-text-muted">
        {t("Didn't get it?")}
        <button
          type="button"
          onClick={() => void resend()}
          disabled={resending}
          className="font-semibold text-ud-primary hover:underline disabled:opacity-50"
        >
          {resending ? t("Sending…") : t("Resend email")}
        </button>
      </div>
      <div className="mt-2 text-center">
        <Link href="/login" className="text-sm text-ud-primary font-medium hover:underline">{t("Back to sign in")}</Link>
      </div>
    </div>
  );
}

function VerifyEmailInner() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const devLink = params.get("devLink") ?? "";
  return <CheckInbox email={email} initialDevLink={devLink} />;
}

export default function VerifyEmailPage() {
  const t = useT();
  const reduce = useReducedMotion();
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <AuthBrandPanel
        headline={t("One quick check and you're in.")}
        subcopy={t("We verify your email to keep your books secure. Your link is single-use and expires in 24 hours.")}
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
            <Suspense fallback={<p className="text-sm text-ud-text-muted text-center">{t("Loading…")}</p>}>
              <VerifyEmailInner />
            </Suspense>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
