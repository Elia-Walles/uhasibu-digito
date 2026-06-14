"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User as UserIcon, Building2, Phone, MapPin } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { signIn } from "next-auth/react";
import { registerTenant } from "@/lib/server/actions/auth";
import { BUSINESS_TYPES } from "@/lib/server/schemas/auth";
import toast from "react-hot-toast";

const TZ_REGIONS = [
  "Dar es Salaam", "Arusha", "Mwanza", "Dodoma", "Mbeya", "Morogoro", "Tanga",
  "Kilimanjaro", "Zanzibar", "Geita", "Kagera", "Tabora", "Other",
];

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [region, setRegion] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await registerTenant({
        name,
        companyName,
        email,
        password,
        businessType: businessType as (typeof BUSINESS_TYPES)[number],
        region,
        ...(phone ? { phone } : {}),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const signInRes = await signIn("credentials", { email, password, redirect: false });
      if (signInRes?.error) {
        toast.success("Account created please sign in");
        router.push("/login");
        return;
      }
      // Carry a plan picked on the public pricing page (/register?plan=key) into onboarding,
      // where it is auto-activated. Only forward a known plan key.
      const picked = new URLSearchParams(window.location.search).get("plan");
      const validPlan = ["starter", "business", "standard", "premium"].includes(picked ?? "") ? picked : null;
      toast.success("Account created. Choose your plan to get started.");
      router.push(validPlan ? `/select-plan?plan=${validPlan}` : "/select-plan");
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
            Run your shop and your books from one place.
          </h2>
          <p className="mt-4 text-white/65 text-sm leading-relaxed">
            Start with Point of Sale, then grow into full Tanzanian-ready accounting, tax and payroll all on Uhasibu Digito.
          </p>
        </div>
      </div>
      <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-16 bg-ud-surface">
        <div className="w-full max-w-md mx-auto">
          <h1 className="font-display text-2xl font-extrabold">Create your account</h1>
          <p className="mt-1 text-sm text-ud-text-muted">Set up your company in a couple of minutes.</p>
          <form onSubmit={onSubmit} className="mt-7 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Full name"    value={name}        onChange={(e) => setName(e.target.value)}        prefixIcon={<UserIcon className="w-4 h-4" />} required />
              <Input label="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} prefixIcon={<Building2 className="w-4 h-4" />} required />
            </div>
            <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" prefixIcon={<Mail className="w-4 h-4" />} required />
            <div className="grid sm:grid-cols-2 gap-3">
              <Select
                label="Business type"
                value={businessType}
                onValueChange={setBusinessType}
                placeholder="Select type"
                options={BUSINESS_TYPES.map((t) => ({ value: t, label: t }))}
              />
              <Select
                label="Region"
                value={region}
                onValueChange={setRegion}
                placeholder="Select region"
                options={TZ_REGIONS.map((r) => ({ value: r, label: r }))}
              />
            </div>
            <Input label="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+255 712 345 678" prefixIcon={<Phone className="w-4 h-4" />} />
            <Input label="Password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" prefixIcon={<Lock className="w-4 h-4" />} required />
            <Button type="submit" variant="primary" size="lg" loading={loading} fullWidth>
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <div className="mt-6 text-xs text-ud-text-muted text-center flex items-center justify-center gap-1.5">
            <MapPin className="w-3 h-3" /> Tanzania-ready · TZS · TRA compliant
          </div>
          <div className="mt-4 text-xs text-ud-text-muted text-center">
            Already have an account? <a href="/login" className="text-ud-primary font-medium hover:underline">Sign in</a>
          </div>
        </div>
      </div>
    </div>
  );
}
