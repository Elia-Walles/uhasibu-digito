"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, ShieldCheck, Sparkles, TrendingUp, FileBarChart } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/lib/store/authStore";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState("demo@uhasibudigito.co.tz");
  const [password, setPassword] = useState("Demo@2024");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      toast.success("Welcome back, Elia");
      router.push("/dashboard");
    } catch {
      toast.error("Could not sign in");
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* LEFT — dark brand panel */}
      <div className="relative hidden md:flex flex-col justify-between p-10 gradient-obsidian text-white overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-ud-primary opacity-20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-ud-gold opacity-10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
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
            <div className="text-xs text-white/55 tracking-wider">AKAUNTI YAKO • NGUVU YAKO</div>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="font-display text-4xl lg:text-5xl font-extrabold leading-[1.05] text-balance">
            Tanzania&apos;s intelligent financial platform.
          </h2>
          <p className="mt-4 text-white/65 text-sm leading-relaxed">
            Twenty modules. Real-time insight from general ledger to payroll, TRA compliance to a smart AI assistant.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {[
              { icon: TrendingUp,   label: "Live KPIs" },
              { icon: ShieldCheck,  label: "NBAA Stamp" },
              { icon: FileBarChart, label: "Statements" },
              { icon: Sparkles,     label: "AI Insights" },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl glass-light"
                >
                  <Icon className="w-4 h-4 text-ud-primary-glow" />
                  <span className="text-sm font-medium">{f.label}</span>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} Kilimanjaro Trading Co. Ltd · Made in 🇹🇿
        </div>
      </div>

      {/* RIGHT — form */}
      <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-16 bg-ud-surface">
        <div className="w-full max-w-sm mx-auto">
          <div className="md:hidden mb-6 flex items-center gap-3">
            <Image
              src="/images/uhasibu-digito-circle.png"
              alt="Uhasibu Digito"
              width={40}
              height={40}
              className="w-10 h-10 rounded-xl"
            />
            <div className="font-display font-bold text-base">Uhasibu Digito</div>
          </div>

          <h1 className="font-display text-2xl font-extrabold text-ud-text-primary">Sign in</h1>
          <p className="mt-1 text-sm text-ud-text-muted">Welcome back. Continue to your dashboard.</p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              prefixIcon={<Mail className="w-4 h-4" />}
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              prefixIcon={<Lock className="w-4 h-4" />}
              required
            />
            <Button type="submit" variant="primary" size="lg" loading={isLoading} fullWidth>
              {isLoading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 px-4 py-3 rounded-xl bg-ud-surface-2 text-xs">
            <div className="font-medium text-ud-text-secondary mb-1">Demo credentials</div>
            <div className="font-mono text-ud-text-muted leading-relaxed">
              demo@uhasibudigito.co.tz<br />
              Demo@2024
            </div>
          </div>

          <div className="mt-6 text-xs text-ud-text-muted text-center">
            New to Uhasibu Digito? <a href="/register" className="text-ud-primary font-medium hover:underline">Create account</a>
          </div>
        </div>
      </div>
    </div>
  );
}
