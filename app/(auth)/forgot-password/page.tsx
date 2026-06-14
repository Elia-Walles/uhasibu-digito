"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, ArrowRight, MailCheck, KeyRound, ShieldCheck, Clock } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { requestPasswordReset } from "@/lib/server/actions/auth";
import toast from "react-hot-toast";

const FEATURES = [
  { icon: ShieldCheck, label: "Secure reset link" },
  { icon: Clock, label: "Expires in 1 hour" },
];

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await requestPasswordReset({ email });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSent(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      <AuthBrandPanel
        headline="Forgot your password? It happens."
        subcopy="Enter your email and we'll send a secure link to set a new one. Your data stays safe the whole time."
        features={FEATURES}
      />

      <div className="relative flex flex-col justify-center p-6 sm:p-10 lg:p-16 bg-ud-surface">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ud-primary-50/60 to-transparent" />

        <Link
          href="/login"
          className="absolute top-5 right-5 inline-flex items-center gap-1.5 text-xs font-medium text-ud-text-muted hover:text-ud-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative w-full max-w-sm mx-auto"
        >
          {sent ? (
            <div className="text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 280, damping: 18 }}
                className="mx-auto w-16 h-16 rounded-2xl bg-ud-success-bg flex items-center justify-center"
              >
                <MailCheck className="w-8 h-8 text-ud-success" />
              </motion.div>
              <h1 className="mt-5 font-display text-2xl font-extrabold text-ud-text-primary">Check your inbox</h1>
              <p className="mt-2 text-sm text-ud-text-secondary leading-relaxed">
                If an account exists for <span className="font-medium text-ud-text-primary">{email}</span>, a reset
                link is on its way. Check your inbox (and spam). The link expires in one hour.
              </p>
              <Link href="/login" className="inline-block mt-6">
                <Button variant="outline" size="lg">Back to sign in</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-ud-primary-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ud-primary">
                <KeyRound className="w-3 h-3" /> Password recovery
              </div>
              <h1 className="mt-4 font-display text-3xl font-extrabold text-ud-text-primary">Reset your password</h1>
              <p className="mt-1.5 text-sm text-ud-text-muted">We&apos;ll email you a secure reset link.</p>

              <form onSubmit={onSubmit} className="mt-7 space-y-4">
                <Input
                  label="Email address"
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
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
              </form>

              <div className="mt-6 text-sm text-ud-text-muted text-center">
                Remembered it? <Link href="/login" className="text-ud-primary font-medium hover:underline">Sign in</Link>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
