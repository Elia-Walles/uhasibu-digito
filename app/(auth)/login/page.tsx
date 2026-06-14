"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Mail, Lock, ShieldCheck, Sparkles, TrendingUp, FileBarChart,
  Eye, EyeOff, ArrowLeft, ArrowRight, CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";

const FEATURES = [
  { icon: TrendingUp, label: "Live KPIs" },
  { icon: ShieldCheck, label: "NBAA Stamp" },
  { icon: FileBarChart, label: "Statements" },
  { icon: Sparkles, label: "AI Insights" },
];

const TRUST = ["TRA-compliant", "TZS-native", "Bank-grade security"];

export default function LoginPage() {
  const router = useRouter();
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
        toast.error("Invalid email or password");
        return;
      }
      toast.success("Welcome back");
      router.push("/dashboard");
    } catch {
      toast.error("Could not sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* LEFT: brand showcase */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 gradient-obsidian text-white overflow-hidden">
        {/* ambient accents */}
        <div className="absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-ud-primary opacity-20 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 w-[26rem] h-[26rem] rounded-full bg-ud-gold opacity-10 blur-3xl" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 flex items-center gap-3"
        >
          <Image
            src="/images/uhasibu-digito-circle.png"
            alt="Uhasibu Digito"
            width={44}
            height={44}
            priority
            className="w-11 h-11 rounded-xl shadow-gold-glow"
          />
          <div>
            <div className="font-display font-bold text-base leading-tight">Uhasibu Digito</div>
            <div className="text-[11px] text-white/55 tracking-[0.18em] uppercase">Akaunti yako, nguvu yako</div>
          </div>
        </motion.div>

        <div className="relative z-10 max-w-lg">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="font-display text-4xl xl:text-5xl font-extrabold leading-[1.06] text-balance"
          >
            The financial platform built for Tanzania.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="mt-4 text-white/65 leading-relaxed"
          >
            Twenty modules in one place: real-time insight from general ledger to payroll, TRA
            compliance to a smart AI assistant.
          </motion.p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.08 }}
                  className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur"
                >
                  <Icon className="w-4 h-4 text-ud-primary-glow flex-shrink-0" />
                  <span className="text-sm font-medium">{f.label}</span>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70"
          >
            {TRUST.map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-ud-primary-glow" /> {t}
              </span>
            ))}
          </motion.div>
        </div>

        <div className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} Uhasibu Digito&trade;. All rights reserved · Made in Tanzania
        </div>
      </div>

      {/* RIGHT: sign-in form */}
      <div className="relative flex flex-col justify-center p-6 sm:p-10 lg:p-16 bg-ud-surface">
        {/* faint top accent */}
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
            <Lock className="w-3 h-3" /> Secure sign in
          </div>
          <h1 className="mt-4 font-display text-3xl font-extrabold text-ud-text-primary">Welcome back</h1>
          <p className="mt-1.5 text-sm text-ud-text-muted">Sign in to continue to your dashboard.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
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
            <div>
              <Input
                label="Password"
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
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />
              <div className="mt-1.5 text-right">
                <Link href="/forgot-password" className="text-xs font-medium text-ud-primary hover:underline">
                  Forgot password?
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
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-ud-text-faint">
            <span className="h-px flex-1 bg-ud-border" />
            New to Uhasibu Digito?
            <span className="h-px flex-1 bg-ud-border" />
          </div>

          <Link href="/register">
            <Button variant="outline" size="lg" fullWidth>
              Create an account
            </Button>
          </Link>

          <p className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-ud-text-faint">
            <ShieldCheck className="w-3.5 h-3.5" /> Protected with bank-grade encryption
          </p>
        </motion.div>
      </div>
    </div>
  );
}
