"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Landmark, RefreshCw, ChevronRight, Plus } from "lucide-react";
import toast from "react-hot-toast";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatRowSkeleton } from "@/components/skeletons/StatRowSkeleton";
import { useBanking } from "@/lib/hooks/useBanking";
import { useCOA } from "@/lib/hooks/useCOA";
import { CashFlowChart } from "@/components/charts/CashFlowChart";
import { formatDate } from "@/lib/utils/dates";
import { useT } from "@/lib/hooks/useT";

export default function BankingPage() {
  const t = useT();
  const { bankAccounts, loading, createBankAccount, revalueFx } = useBanking();
  const { accounts } = useCOA();
  const totalTZS = bankAccounts.filter((a) => a.currency === "TZS").reduce((s, a) => s + a.balance, 0);
  const usdAccount = bankAccounts.find((a) => a.currency === "USD");

  // GL cash/bank accounts (11xx leaves) available to link a bank account to.
  const cashAccounts = useMemo(
    () => accounts.filter((a) => a.code.startsWith("11") && a.level >= 2),
    [accounts],
  );

  const recentTxns = useMemo(
    () => bankAccounts.flatMap((a) => a.transactions).sort((x, y) => y.date.localeCompare(x.date)).slice(0, 8),
    [bankAccounts],
  );

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ bankName: "CRDB Bank", accountName: "", accountNumber: "", currency: "TZS" as "TZS" | "USD" | "EUR", coaAccountCode: "", openingBalance: 0, exchangeRate: 1 });
  const [revalOpen, setRevalOpen] = useState(false);
  const [revalRate, setRevalRate] = useState(0);
  const [revaluing, setRevaluing] = useState(false);
  const foreignAccounts = bankAccounts.filter((a) => a.currency !== "TZS");

  function openModal() {
    setForm({ bankName: "CRDB Bank", accountName: "", accountNumber: "", currency: "TZS", coaAccountCode: cashAccounts[0]?.code ?? "1110", openingBalance: 0, exchangeRate: 1 });
    setOpen(true);
  }

  async function doRevalue() {
    const acc = foreignAccounts[0];
    if (!acc || revalRate <= 0) return toast.error(t("Enter the closing exchange rate"));
    setRevaluing(true);
    try {
      const res = await revalueFx({ bankAccountId: acc.id, rate: revalRate });
      if (!res.ok) return toast.error(res.error);
      toast.success(res.data.delta === 0 ? t("No revaluation needed — already at rate") : t("FX revaluation posted · {amt} to the ledger", { amt: Math.abs(res.data.delta).toLocaleString() }));
      setRevalOpen(false);
    } finally {
      setRevaluing(false);
    }
  }

  async function save() {
    if (!form.accountName.trim()) return toast.error(t("Account name is required"));
    if (!form.coaAccountCode) return toast.error(t("Link a general-ledger account"));
    setSaving(true);
    try {
      const res = await createBankAccount(form);
      if (!res.ok) return toast.error(res.error);
      toast.success(t("Bank account added · opening balance posted to the ledger"));
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Banking"
        subtitle={t("{accounts} bank accounts · {transactions} transactions", { accounts: bankAccounts.length, transactions: bankAccounts.flatMap((a) => a.transactions).length })}
        actions={
          <>
            {foreignAccounts.length > 0 && (
              <Button variant="outline" onClick={() => { setRevalRate(0); setRevalOpen(true); }}>{t("Revalue FX")}</Button>
            )}
            <Button variant="outline" icon={<Plus className="w-4 h-4" />} onClick={openModal}>{t("Add account")}</Button>
            <Link href="/banking/reconciliation"><Button variant="primary" icon={<RefreshCw className="w-4 h-4" />}>{t("Reconcile")}</Button></Link>
          </>
        }
      />

      {loading ? <StatRowSkeleton count={4} /> : bankAccounts.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No bank accounts yet"
          description="Add a bank account and link it to a GL cash account. Its opening balance posts to the ledger, and every cash journal keeps it in sync."
          action={{ label: "Add account", onClick: openModal, icon: <Plus className="w-4 h-4" /> }}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {bankAccounts.map((a) => (
              <Link
                key={a.id}
                href={`/banking/accounts/${a.id}`}
                className="group bg-white border border-ud-border rounded-2xl p-5 shadow-card hover:border-ud-primary hover:shadow-card-hover transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.08em] font-semibold text-ud-text-muted">{a.bankName}</div>
                    <div className="text-sm font-medium mt-1 truncate">{a.accountName}</div>
                    <div className="text-xs text-ud-text-muted font-mono mt-0.5">{a.accountNumber} · GL {a.coaAccountCode}</div>
                  </div>
                  <Badge variant={a.currency === "USD" ? "info" : "teal"} size="sm">{a.currency}</Badge>
                </div>
                <div className="font-display font-extrabold text-2xl tabular-nums">
                  {a.currency === "USD" ? `$${(a.balanceUSD ?? a.balance).toLocaleString()}` : <CurrencyDisplay amount={a.balance} />}
                </div>
                {a.currency !== "TZS" && (
                  <div className="mt-0.5 text-xs text-ud-text-muted">≈ <CurrencyDisplay amount={a.balance} /> {t("carrying")}</div>
                )}
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-ud-text-muted">{t("{n} transactions", { n: a.transactions.length })}</span>
                  <span className="text-ud-primary font-medium inline-flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
                    {t("View")} <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2 bg-white border border-ud-border rounded-2xl p-5 shadow-card">
              <h3 className="font-display font-bold text-base mb-3">{t("Cash bridge")}</h3>
              <CashFlowChart />
            </div>
            <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card">
              <h3 className="font-display font-bold text-base mb-3">{t("Recent transactions")}</h3>
              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {recentTxns.length === 0 ? (
                  <p className="text-sm text-ud-text-muted">{t("No transactions yet.")}</p>
                ) : recentTxns.map((tx) => (
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
              <span className="font-medium text-ud-primary">{t("Total liquid TZS:")}</span>{" "}
              <CurrencyDisplay amount={totalTZS} className="font-bold text-ud-primary" />
              <span className="text-ud-text-muted ml-2">· USD: ${(usdAccount?.balanceUSD ?? usdAccount?.balance ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </>
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Add bank account"
        description={t("Linked to a GL cash account so the ledger and bank balance stay reconciled.")}
        size="md"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>{t("Cancel")}</Button><Button variant="primary" loading={saving} onClick={() => void save()}>{t("Add account")}</Button></>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label={t("Bank")} value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
          <Input label={t("Account name")} value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} />
          <Input label={t("Account number")} value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
          <Select label={t("Currency")} value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v as "TZS" | "USD" | "EUR" })}
            options={[{ value: "TZS", label: "TZS" }, { value: "USD", label: "USD" }, { value: "EUR", label: "EUR" }]} />
          <Select label={t("GL account")} value={form.coaAccountCode} onValueChange={(v) => setForm({ ...form, coaAccountCode: v })}
            options={cashAccounts.map((a) => ({ value: a.code, label: `${a.code} · ${a.name}` }))} />
          <Input label={t("Opening balance ({cur})", { cur: form.currency })} type="number" value={String(form.openingBalance)} onChange={(e) => setForm({ ...form, openingBalance: Number(e.target.value) || 0 })} className="text-right font-mono" />
          {form.currency !== "TZS" && (
            <Input label={t("Exchange rate (1 {cur} = ? TZS)", { cur: form.currency })} type="number" value={String(form.exchangeRate)} onChange={(e) => setForm({ ...form, exchangeRate: Number(e.target.value) || 0 })} className="text-right font-mono" />
          )}
        </div>
        {form.currency !== "TZS" && (
          <p className="mt-3 text-xs text-ud-text-muted">{t("The ledger is kept in TZS: {op} {cur} posts as {tzs} TZS at this rate.", { op: form.openingBalance.toLocaleString(), cur: form.currency, tzs: Math.round(form.openingBalance * form.exchangeRate).toLocaleString() })}</p>
        )}
      </Modal>

      <Modal
        open={revalOpen}
        onOpenChange={setRevalOpen}
        title="Revalue foreign balance"
        description={t("Re-price the foreign account at the closing rate. The difference posts to FX Gain (4300) or FX Loss (6600).")}
        size="sm"
        footer={<><Button variant="ghost" onClick={() => setRevalOpen(false)}>{t("Cancel")}</Button><Button variant="primary" loading={revaluing} onClick={() => void doRevalue()}>{t("Post revaluation")}</Button></>}
      >
        {foreignAccounts[0] && (
          <div className="space-y-3">
            <div className="text-sm text-ud-text-secondary">{foreignAccounts[0].bankName} · {foreignAccounts[0].accountName}</div>
            <div className="text-sm">{t("Balance")}: <span className="font-mono font-medium">${(foreignAccounts[0].balanceUSD ?? 0).toLocaleString()}</span> · {t("carrying")} <CurrencyDisplay amount={foreignAccounts[0].balance} /></div>
            <Input label={t("Closing rate (1 {cur} = ? TZS)", { cur: foreignAccounts[0].currency })} type="number" value={String(revalRate)} onChange={(e) => setRevalRate(Number(e.target.value) || 0)} className="text-right font-mono" />
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
