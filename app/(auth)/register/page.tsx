"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User as UserIcon, Building2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/lib/store/authStore";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    await login("new@uhasibudigito.co.tz", "Demo@2024");
    toast.success("Account created. Welcome!");
    setLoading(false);
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="relative hidden md:flex flex-col justify-center p-10 gradient-obsidian text-white overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-ud-primary opacity-20 blur-3xl" />
        <div className="relative z-10 max-w-md">
          <h2 className="font-display text-4xl font-extrabold leading-[1.1] text-balance">
            Get your books in order in minutes.
          </h2>
          <p className="mt-4 text-white/65 text-sm leading-relaxed">
            Set up your Tanzanian-ready chart of accounts, TRA-compliant tax filings, and statutory payroll out of the box.
          </p>
        </div>
      </div>
      <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-16 bg-ud-surface">
        <div className="w-full max-w-sm mx-auto">
          <h1 className="font-display text-2xl font-extrabold">Create your account</h1>
          <p className="mt-1 text-sm text-ud-text-muted">Free demo — no credit card required.</p>
          <form onSubmit={onSubmit} className="mt-7 space-y-3">
            <Input label="Full name"    prefixIcon={<UserIcon className="w-4 h-4" />} required />
            <Input label="Company name" prefixIcon={<Building2 className="w-4 h-4" />} required />
            <Input label="Email"        type="email" prefixIcon={<Mail className="w-4 h-4" />} required />
            <Input label="Password"     type="password" prefixIcon={<Lock className="w-4 h-4" />} required />
            <Button type="submit" variant="primary" size="lg" loading={loading} fullWidth>
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <div className="mt-6 text-xs text-ud-text-muted text-center">
            Already have an account? <a href="/login" className="text-ud-primary font-medium hover:underline">Sign in</a>
          </div>
        </div>
      </div>
    </div>
  );
}
