"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User as UserIcon, Building2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { signIn } from "next-auth/react";
import { registerTenant } from "@/lib/server/actions/auth";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await registerTenant({ name, companyName, email, password });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const signInRes = await signIn("credentials", { email, password, redirect: false });
      if (signInRes?.error) {
        toast.success("Account created — please sign in");
        router.push("/login");
        return;
      }
      toast.success("Account created. Welcome!");
      router.push("/dashboard");
    } catch {
      toast.error("Could not create your account");
    } finally {
      setLoading(false);
    }
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
          <p className="mt-1 text-sm text-ud-text-muted">Set up your company in a couple of minutes.</p>
          <form onSubmit={onSubmit} className="mt-7 space-y-3">
            <Input label="Full name"    value={name}        onChange={(e) => setName(e.target.value)}        prefixIcon={<UserIcon className="w-4 h-4" />} required />
            <Input label="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} prefixIcon={<Building2 className="w-4 h-4" />} required />
            <Input label="Email"        value={email}       onChange={(e) => setEmail(e.target.value)}       type="email" prefixIcon={<Mail className="w-4 h-4" />} required />
            <Input label="Password"     value={password}    onChange={(e) => setPassword(e.target.value)}    type="password" prefixIcon={<Lock className="w-4 h-4" />} required />
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
