"use client";
import { useState } from "react";
import { Mail } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { requestPasswordReset } from "@/lib/server/actions/auth";
import toast from "react-hot-toast";

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
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="relative hidden md:flex flex-col justify-center p-10 gradient-obsidian text-white overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-ud-primary opacity-20 blur-3xl" />
        <div className="relative z-10 max-w-md">
          <h2 className="font-display text-4xl font-extrabold leading-[1.1] text-balance">
            Forgot your password?
          </h2>
          <p className="mt-4 text-white/65 text-sm leading-relaxed">
            Enter your email and we&apos;ll send you a secure link to set a new one.
          </p>
        </div>
      </div>
      <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-16 bg-ud-surface">
        <div className="w-full max-w-sm mx-auto">
          <h1 className="font-display text-2xl font-extrabold">Reset password</h1>
          {sent ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-ud-text-secondary leading-relaxed">
                If an account exists for <span className="font-medium">{email}</span>, a reset link is on its
                way. Check your inbox (and spam) the link expires in one hour.
              </p>
              <a href="/login" className="text-sm text-ud-primary font-medium hover:underline">Back to sign in</a>
            </div>
          ) : (
            <>
              <p className="mt-1 text-sm text-ud-text-muted">We&apos;ll email you a reset link.</p>
              <form onSubmit={onSubmit} className="mt-7 space-y-4">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  prefixIcon={<Mail className="w-4 h-4" />}
                  required
                />
                <Button type="submit" variant="primary" size="lg" loading={loading} fullWidth>
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
              </form>
              <div className="mt-6 text-xs text-ud-text-muted text-center">
                Remembered it? <a href="/login" className="text-ud-primary font-medium hover:underline">Sign in</a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
