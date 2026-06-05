"use client";
import Link from "next/link";
import { Landmark, RefreshCw, ChevronRight } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { StatRowSkeleton } from "@/components/skeletons/StatRowSkeleton";
import { useBanking } from "@/lib/hooks/useBanking";
import { CashFlowChart } from "@/components/charts/CashFlowChart";
import { formatDate } from "@/lib/utils/dates";

export default function BankingPage() {
  const { bankAccounts: BANK_ACCOUNTS, loading: bankLoading } = useBanking();
  const loading = bankLoading;
  const totalTZS = BANK_ACCOUNTS.filter((a) => a.currency === "TZS").reduce((s, a) => s + a.balance, 0);

  return (
    <PageWrapper>
      <PageHeader
        title="Banking"
        subtitle={`${BANK_ACCOUNTS.length} bank accounts · ${BANK_ACCOUNTS.flatMap((a) => a.transactions).length} transactions`}
        actions={<Link href="/banking/reconciliation"><Button variant="primary" icon={<RefreshCw className="w-4 h-4" />}>Reconcile</Button></Link>}
      />

      {loading ? <StatRowSkeleton count={4} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {BANK_ACCOUNTS.map((a) => (
            <Link
              key={a.id}
              href={`/banking/accounts/${a.id}`}
              className="group bg-white border border-ud-border rounded-2xl p-5 shadow-card hover:border-ud-primary hover:shadow-card-hover transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.08em] font-semibold text-ud-text-muted">{a.bankName}</div>
                  <div className="text-sm font-medium mt-1 truncate">{a.accountName}</div>
                  <div className="text-xs text-ud-text-muted font-mono mt-0.5">{a.accountNumber}</div>
                </div>
                <Badge variant={a.currency === "USD" ? "info" : "teal"} size="sm">{a.currency}</Badge>
              </div>
              <div className="font-display font-extrabold text-2xl tabular-nums">
                {a.currency === "USD" ? `$${a.balance.toLocaleString()}` : <CurrencyDisplay amount={a.balance} compact />}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-ud-text-muted">{a.transactions.length} transactions</span>
                <span className="text-ud-primary font-medium inline-flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
                  View <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-white border border-ud-border rounded-2xl p-5 shadow-card">
          <h3 className="font-display font-bold text-base mb-3">Cash bridge — October</h3>
          <CashFlowChart />
        </div>
        <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card">
          <h3 className="font-display font-bold text-base mb-3">Recent transactions</h3>
          <div className="space-y-2.5 max-h-72 overflow-y-auto">
            {BANK_ACCOUNTS[0]!.transactions.slice(0, 8).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between gap-2 pb-2 border-b border-ud-border last:border-b-0">
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{tx.description}</div>
                  <div className="text-[10px] text-ud-text-muted font-mono">{formatDate(tx.date)} · {tx.reference}</div>
                </div>
                <div className={`text-sm font-mono font-medium ${tx.credit > 0 ? "text-ud-success" : "text-ud-danger"}`}>
                  {tx.credit > 0 ? "+" : "-"}{(tx.credit + tx.debit).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-ud-primary-50 border border-ud-primary-100 rounded-2xl p-4 text-sm flex items-center gap-3">
        <Landmark className="w-5 h-5 text-ud-primary" />
        <div>
          <span className="font-medium text-ud-primary">Total liquid TZS:</span>{" "}
          <CurrencyDisplay amount={totalTZS} className="font-bold text-ud-primary" />
          <span className="text-ud-text-muted ml-2">· USD: ${BANK_ACCOUNTS.find((a) => a.currency === "USD")?.balance.toLocaleString() ?? 0}</span>
        </div>
      </div>
    </PageWrapper>
  );
}
