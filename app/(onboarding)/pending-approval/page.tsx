"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { LogOut, Clock, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { SubscriptionInvoiceView } from "@/components/billing/SubscriptionInvoiceView";
import { useSignOut } from "@/lib/auth/client";
import { getMySubscriptionInvoice } from "@/lib/server/actions/billing";
import { useT } from "@/lib/hooks/useT";
import type { SubscriptionInvoiceView as Invoice } from "@/types/billing";
import toast from "react-hot-toast";

export default function PendingApprovalPage() {
  const router = useRouter();
  const { update } = useSession();
  const signOut = useSignOut();
  const t = useT();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    getMySubscriptionInvoice()
      .then((res) => {
        if (res.ok) setInvoice(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function refreshStatus() {
    setRefreshing(true);
    try {
      const session = await update();
      if (session?.user?.status === "active") {
        router.push("/dashboard");
      } else {
        toast(t("Still awaiting approval. We'll email you once your account is active."));
      }
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-ud-surface-3 overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-ud-primary opacity-10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-ud-gold opacity-10 blur-3xl" />

      <header className="relative flex items-center justify-between px-5 sm:px-8 lg:px-12 h-16 border-b border-ud-border bg-ud-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Image src="/images/uhasibu-digito-circle.png" alt="Uhasibu Digito" width={32} height={32} className="w-8 h-8 rounded-lg" priority />
          <span className="font-display font-bold">Uhasibu Digito</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button onClick={() => void signOut()} className="inline-flex items-center gap-1.5 text-sm text-ud-text-muted hover:text-ud-text-primary transition-colors">
            <LogOut className="w-4 h-4" /> {t("Sign out")}
          </button>
        </div>
      </header>

      <main className="relative w-full px-5 sm:px-8 lg:px-12 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <div className="mx-auto w-14 h-14 rounded-2xl bg-ud-warning-bg flex items-center justify-center">
              <Clock className="w-7 h-7 text-ud-warning" />
            </div>
            <h1 className="mt-4 font-display font-extrabold text-2xl sm:text-3xl text-balance">{t("Awaiting activation")}</h1>
            <p className="mt-2 text-sm text-ud-text-secondary text-balance max-w-lg mx-auto">
              {t("Thanks! Please complete the bank transfer for the invoice below. Once our team confirms your payment, your account will be activated and you'll get full access.")}
            </p>
          </motion.div>

          <div className="mt-8">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-ud-text-muted">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : invoice ? (
              <SubscriptionInvoiceView invoice={invoice} />
            ) : (
              <div className="rounded-3xl border border-ud-border bg-ud-surface shadow-card p-8 text-center text-sm text-ud-text-muted">
                {t("No invoice found. Please choose a plan to continue.")}
                <div className="mt-4">
                  <Button variant="outline" onClick={() => router.push("/select-plan")}>{t("Choose a plan")}</Button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-center">
            <Button
              variant="secondary"
              onClick={() => void refreshStatus()}
              loading={refreshing}
              icon={!refreshing ? <RefreshCw className="w-4 h-4" /> : undefined}
            >
              {t("I've paid — refresh status")}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
