"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, MailWarning, Copy, Check, ShieldCheck, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { useT } from "@/lib/hooks/useT";
import { generateVerificationCode } from "@/lib/server/actions/auth";
import toast from "react-hot-toast";

const FEATURES = [
  { icon: ShieldCheck, label: "Encrypted at rest" },
  { icon: KeyRound, label: "Expires in 15 minutes" },
];

type State = "generating" | "ready" | "error";

function CodeInner() {
  const t = useT();
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<State>("generating");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void (async () => {
      if (!token) {
        setMessage(t("This verification link is missing its token. Please request a new one."));
        setState("error");
        return;
      }
      const res = await generateVerificationCode({ token });
      if (res.ok) {
        setCode(res.data.code);
        setEmail(res.data.email);
        setState("ready");
      } else {
        setMessage(res.error);
        setState("error");
      }
    })();
  }, [token, t]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(t("Code copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("Could not copy press and hold to copy"));
    }
  }

  if (state === "generating") {
    return (
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-ud-primary-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-ud-primary animate-spin" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-extrabold text-ud-text-primary">{t("Generating your code…")}</h1>
        <p className="mt-2 text-sm text-ud-text-secondary">{t("This only takes a moment.")}</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-ud-warning-bg flex items-center justify-center">
          <MailWarning className="w-8 h-8 text-ud-warning" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-extrabold text-ud-text-primary">{t("Couldn't generate a code")}</h1>
        <p className="mt-2 text-sm text-ud-text-secondary">{t(message) || t("This verification link is invalid or has expired. Please request a new one.")}</p>
        <Link href="/login" className="inline-block mt-6">
          <Button variant="outline" size="lg">{t("Back to sign in")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-ud-primary-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ud-primary">
        <KeyRound className="w-3 h-3" /> {t("Your verification code")}
      </div>
      <h1 className="mt-4 font-display text-2xl font-extrabold text-ud-text-primary">{t("Here's your code")}</h1>
      <p className="mt-2 text-sm text-ud-text-secondary">{t("Copy this code and enter it on the verification page to activate your account.")}</p>

      {/* The code */}
      <div className="mt-6 rounded-2xl border border-ud-border bg-ud-surface-2 p-5">
        <div className="font-mono tabular-nums text-4xl sm:text-5xl font-extrabold tracking-[0.35em] text-ud-text-primary select-all pl-[0.35em]">
          {code}
        </div>
      </div>

      <div className="mt-4">
        <Button
          variant={copied ? "secondary" : "primary"}
          size="lg"
          fullWidth
          icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          onClick={() => void copy()}
        >
          {copied ? t("Copied") : t("Copy code")}
        </Button>
      </div>

      <div className="mt-3">
        <Link href={`/verify-email${email ? `?email=${encodeURIComponent(email)}` : ""}`}>
          <Button variant="outline" size="lg" fullWidth icon={<ArrowRight className="w-4 h-4" />}>
            {t("Continue to verification")}
          </Button>
        </Link>
      </div>

      <p className="mt-4 text-[11px] text-ud-text-faint">{t("This code expires in 15 minutes.")}</p>
    </div>
  );
}

export default function VerifyEmailCodePage() {
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
              <CodeInner />
            </Suspense>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
