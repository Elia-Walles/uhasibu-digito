"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, ArrowLeft, ArrowRight, ShieldCheck, KeyRound, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";
import { resetPassword } from "@/lib/server/actions/auth";
import toast from "react-hot-toast";

const FEATURES = [
  { icon: ShieldCheck, label: "Encrypted at rest" },
  { icon: KeyRound, label: "Single-use link" },
];

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await resetPassword({ token, password });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Password updated, please sign in");
      router.push("/login");
    } catch {
      toast.error("Something went wrong. Please try again.");
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
        <h1 className="mt-5 font-display text-2xl font-extrabold text-ud-text-primary">Link is incomplete</h1>
        <p className="mt-2 text-sm text-ud-text-secondary">This reset link is missing its token. Request a new one.</p>
        <Link href="/forgot-password" className="inline-block mt-6">
          <Button variant="outline" size="lg">Request a new link</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="inline-flex items-center gap-1.5 rounded-full bg-ud-primary-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ud-primary">
        <KeyRound className="w-3 h-3" /> New password
      </div>
      <h1 className="mt-4 font-display text-3xl font-extrabold text-ud-text-primary">Set a new password</h1>
      <p className="mt-1.5 text-sm text-ud-text-muted">Choose a strong password you don&apos;t use elsewhere.</p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <Input
          label="New password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
        <Input
          label="Confirm password"
          type={showPassword ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Re-enter your password"
          prefixIcon={<Lock className="w-4 h-4" />}
          autoComplete="new-password"
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
          {loading ? "Updating…" : "Update password"}
        </Button>
      </form>

      <div className="mt-6 text-sm text-ud-text-muted text-center">
        <Link href="/login" className="text-ud-primary font-medium hover:underline">Back to sign in</Link>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      <AuthBrandPanel
        headline="One step to secure access."
        subcopy="Set a fresh password and you're back in. Your reset link is single-use and encrypted end to end."
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
          <Suspense fallback={<p className="text-sm text-ud-text-muted">Loading…</p>}>
            <ResetForm />
          </Suspense>
        </motion.div>
      </div>
    </div>
  );
}
