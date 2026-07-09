"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FileBarChart, Scale, TrendingUp, Wallet, Lock, ListPlus } from "lucide-react";
import toast from "react-hot-toast";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getCloseStatus, closeFiscalYear } from "@/lib/server/actions/period-close";
import { formatTZS } from "@/lib/utils/currency";
import { useT } from "@/lib/hooks/useT";

const STATEMENTS = [
  { name: "Income Statement",            href: "/financial-statements/income-statement", description: "Profit & loss for the period", icon: TrendingUp,    color: "gradient-teal" },
  { name: "Balance Sheet",               href: "/financial-statements/balance-sheet",    description: "Statement of financial position", icon: Scale,       color: "gradient-emerald" },
  { name: "Cash Flow Statement",         href: "/financial-statements/cash-flow",        description: "Operating, investing, financing", icon: Wallet,        color: "gradient-blue" },
  { name: "Statement of Changes in Equity", href: "/financial-statements/equity",        description: "Equity movements during the period", icon: FileBarChart, color: "gradient-amber" },
];

type CloseStatus = Awaited<ReturnType<typeof getCloseStatus>>;

export default function FinancialStatementsHome() {
  const t = useT();
  const [status, setStatus] = useState<CloseStatus | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [closing, setClosing] = useState(false);

  const refresh = () => { void getCloseStatus().then(setStatus); };
  useEffect(() => { refresh(); }, []);

  async function doClose() {
    setClosing(true);
    try {
      const res = await closeFiscalYear();
      if (!res.ok) return toast.error(res.error);
      toast.success(t("{label} closed · net result posted to Retained Earnings", { label: res.data.label }));
      refresh();
    } finally {
      setClosing(false);
    }
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Financial statements"
        subtitle="Income statement, balance sheet, cash flow, and changes in equity"
        actions={<ExportMenu fileLabel="financial statements" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {STATEMENTS.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="group bg-white border border-ud-border rounded-2xl p-5 hover:border-ud-primary hover:shadow-card-hover transition-all"
            >
              <div className={`w-12 h-12 rounded-2xl ${s.color} flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-display font-bold text-lg text-ud-text-primary group-hover:text-ud-primary transition-colors">{t(s.name)}</h3>
              <p className="mt-1 text-sm text-ud-text-muted">{t(s.description)}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/general-ledger/opening-balances" className="group bg-white border border-ud-border rounded-2xl p-5 flex items-center gap-4 hover:border-ud-primary hover:shadow-card-hover transition-all">
          <div className="w-11 h-11 rounded-xl bg-ud-primary-50 flex items-center justify-center flex-shrink-0"><ListPlus className="w-5 h-5 text-ud-primary" /></div>
          <div>
            <h3 className="font-display font-bold text-ud-text-primary group-hover:text-ud-primary transition-colors">{t("Opening balances")}</h3>
            <p className="text-sm text-ud-text-muted">{t("Set go-live balances so the statements reflect your true position.")}</p>
          </div>
        </Link>

        <div className="bg-white border border-ud-border rounded-2xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-ud-gold-50 flex items-center justify-center flex-shrink-0"><Lock className="w-5 h-5 text-ud-gold-dark" /></div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-bold text-ud-text-primary">{t("Year-end close")}</h3>
            {status ? (
              status.closed ? (
                <p className="text-sm text-ud-success">{t("{label} is closed · books locked", { label: status.label })}</p>
              ) : (
                <p className="text-sm text-ud-text-muted">{t("{label} · net result {amt} to Retained Earnings", { label: status.label, amt: formatTZS(status.netProfit) })}</p>
              )
            ) : <p className="text-sm text-ud-text-muted">{t("Loading…")}</p>}
          </div>
          {status && !status.closed && status.hasActivity && (
            <Button variant="primary" size="sm" onClick={() => setConfirm(true)}>{t("Close year")}</Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t("Close {label}?", { label: status?.label ?? "" })}
        message={t("This posts the year's profit or loss to Retained Earnings and LOCKS the books through {fyEnd} — no further entries can be dated in that period. This can't be easily undone.", { fyEnd: status?.fyEnd ?? "" })}
        confirmLabel={t("Close the year")}
        variant="primary"
        onConfirm={() => void doClose()}
      />
    </PageWrapper>
  );
}
