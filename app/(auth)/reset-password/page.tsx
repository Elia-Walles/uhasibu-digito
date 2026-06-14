"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { resetPassword } from "@/lib/server/actions/auth";
import toast from "react-hot-toast";

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

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
      toast.success("Password updated please sign in");
      router.push("/login");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ud-text-secondary">This reset link is missing its token. Request a new one.</p>
        <a href="/forgot-password" className="text-sm text-ud-primary font-medium hover:underline">Request a new link</a>
      </div>
    );
  }

  return (
    <>
      <h1 className="font-display text-2xl font-extrabold">Set a new password</h1>
      <p className="mt-1 text-sm text-ud-text-muted">Choose a strong password you don&apos;t use elsewhere.</p>
      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <Input
          label="New password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          prefixIcon={<Lock className="w-4 h-4" />}
          required
        />
        <Input
          label="Confirm password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          prefixIcon={<Lock className="w-4 h-4" />}
          required
        />
        <Button type="submit" variant="primary" size="lg" loading={loading} fullWidth>
          {loading ? "Updating…" : "Update password"}
        </Button>
      </form>
      <div className="mt-6 text-xs text-ud-text-muted text-center">
        <a href="/login" className="text-ud-primary font-medium hover:underline">Back to sign in</a>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="relative hidden md:flex flex-col justify-center p-10 gradient-obsidian text-white overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-ud-primary opacity-20 blur-3xl" />
        <div className="relative z-10 max-w-md">
          <h2 className="font-display text-4xl font-extrabold leading-[1.1] text-balance">
            One step to secure access.
          </h2>
        </div>
      </div>
      <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-16 bg-ud-surface">
        <div className="w-full max-w-sm mx-auto">
          <Suspense fallback={<p className="text-sm text-ud-text-muted">Loading…</p>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
