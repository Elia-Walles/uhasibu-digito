"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { useBanking } from "@/lib/hooks/useBanking";
import { formatDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import toast from "react-hot-toast";

type Phase = "idle" | "importing" | "matching" | "done";

export default function ReconciliationPage() {
  const { bankAccounts, reconcileAccount } = useBanking();
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);

  const account = bankAccounts[0];
  const txs = account?.transactions ?? [];

  async function postMatched() {
    if (!account) return;
    const res = await reconcileAccount(account.id);
    if (res.ok) toast.success(`Posted · ${res.data.count} transactions matched`);
    else toast.error(res.error);
  }

  async function runReconciliation() {
    setPhase("importing");
    setProgress(0);
    for (let i = 0; i <= 100; i += 5) {
      setProgress(i);
      await new Promise((r) => setTimeout(r, 50));
    }
    setPhase("matching");
    await new Promise((r) => setTimeout(r, 1800));
    setPhase("done");
    toast.success("Reconciliation complete · 24 of 30 matched");
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Bank Reconciliation"
        subtitle="CRDB Bank · October 2024"
        breadcrumbs={[{ label: "Banking", href: "/banking" }, { label: "Reconciliation" }]}
      />

      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="bg-white border border-ud-border rounded-2xl p-10 shadow-card text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-ud-primary-50 flex items-center justify-center mb-4">
                <Upload className="w-7 h-7 text-ud-primary" />
              </div>
              <h3 className="font-display font-bold text-xl">Import bank statement</h3>
              <p className="text-sm text-ud-text-muted mt-2 max-w-md mx-auto">
                Upload your CRDB bank statement (.OFX / .CSV) — Uhasibu Digito will match transactions automatically.
              </p>
              <Button variant="primary" size="lg" onClick={runReconciliation} className="mt-5" icon={<Upload className="w-4 h-4" />}>
                Use sample statement
              </Button>
            </div>
          </motion.div>
        )}

        {phase === "importing" && (
          <motion.div key="importing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="bg-white border border-ud-border rounded-2xl p-10 shadow-card text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-ud-primary-50 flex items-center justify-center mb-4 animate-pulse-soft">
                <Upload className="w-7 h-7 text-ud-primary" />
              </div>
              <h3 className="font-display font-bold text-xl">Importing statement…</h3>
              <p className="text-sm text-ud-text-muted mt-2">{progress}% complete</p>
              <div className="max-w-md mx-auto mt-4 h-2 bg-ud-primary-50 rounded-full overflow-hidden">
                <motion.div className="h-full gradient-teal" animate={{ width: `${progress}%` }} />
              </div>
            </div>
          </motion.div>
        )}

        {phase === "matching" && (
          <motion.div key="matching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="bg-white border border-ud-border rounded-2xl p-10 shadow-card text-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="w-16 h-16 mx-auto rounded-2xl gradient-teal flex items-center justify-center mb-4"
              >
                <Sparkles className="w-7 h-7 text-white" />
              </motion.div>
              <h3 className="font-display font-bold text-xl">Smart matching in progress…</h3>
              <p className="text-sm text-ud-text-muted mt-2 max-w-md mx-auto">
                Matching bank lines to journal entries by reference, amount and date.
              </p>
            </div>
          </motion.div>
        )}

        {phase === "done" && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              <SummaryCard label="Matched"    value="24"  color="success" icon={<CheckCircle2 className="w-5 h-5" />} />
              <SummaryCard label="Unmatched"  value="6"   color="warning" icon={<AlertTriangle className="w-5 h-5" />} />
              <SummaryCard label="Total"      value="30"  color="default" />
            </div>
            <div className="bg-white border border-ud-border rounded-2xl shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-ud-border flex items-center justify-between">
                <h3 className="font-display font-bold text-base">Bank transactions</h3>
                <Button variant="primary" size="sm" onClick={() => void postMatched()}>Post matched entries</Button>
              </div>
              <div className="divide-y divide-ud-border max-h-[480px] overflow-y-auto">
                {txs.map((tx) => {
                  const matched = tx.matched;
                  return (
                    <div key={tx.id} className={cn("flex items-center gap-3 px-5 py-3", !matched && "bg-ud-warning-bg/40")}>
                      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", matched ? "bg-ud-success" : "bg-ud-warning")} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{tx.description}</div>
                        <div className="text-xs text-ud-text-muted font-mono">{formatDate(tx.date)} · {tx.reference}</div>
                      </div>
                      <div className={cn("font-mono text-sm font-medium", tx.credit > 0 ? "text-ud-success" : "text-ud-danger")}>
                        <CurrencyDisplay amount={tx.credit > 0 ? tx.credit : -tx.debit} showSymbol={false} />
                      </div>
                      <Badge variant={matched ? "success" : "warning"} size="sm">{matched ? "Matched" : "Unmatched"}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}

function SummaryCard({ label, value, color, icon }: { label: string; value: string; color: "success" | "warning" | "default"; icon?: React.ReactNode }) {
  const bg = color === "success" ? "bg-ud-success-bg text-ud-success border-ud-success/20" :
             color === "warning" ? "bg-ud-warning-bg text-ud-warning border-ud-warning/20" :
             "bg-white text-ud-text-primary border-ud-border";
  return (
    <div className={`p-4 rounded-2xl border ${bg}`}>
      <div className="flex items-center gap-2">
        {icon}
        <div className="text-xs uppercase tracking-[0.08em] font-semibold">{label}</div>
      </div>
      <div className="mt-2 font-display font-extrabold text-3xl tabular-nums">{value}</div>
    </div>
  );
}
