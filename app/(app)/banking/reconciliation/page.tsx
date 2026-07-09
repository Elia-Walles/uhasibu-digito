"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { CheckCircle2, AlertTriangle, Plus, Upload } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { EmptyState } from "@/components/ui/EmptyState";
import { useBanking, type StatementLine } from "@/lib/hooks/useBanking";
import { listStatementLines, importStatementLines } from "@/lib/server/actions/banking";
import { parseCsv } from "@/lib/utils/csv";
import { formatDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import { useT } from "@/lib/hooks/useT";
import toast from "react-hot-toast";

/** Best-effort date normaliser for imported statements (assumes DD/MM/YYYY for slashed dates). */
function normalizeDate(s?: string): string {
  const raw = (s ?? "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const m = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    const d = m[1]!, mo = m[2]!;
    const y = m[3]!.length === 2 ? `20${m[3]}` : m[3]!;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const dt = new Date(raw);
  return Number.isNaN(dt.getTime()) ? "" : dt.toISOString().split("T")[0]!;
}

export default function ReconciliationPage() {
  const t = useT();
  const { bankAccounts, addStatementLine } = useBanking();
  const [accountId, setAccountId] = useState("");
  const [lines, setLines] = useState<StatementLine[]>([]);
  const today = new Date().toISOString().split("T")[0]!;
  const [form, setForm] = useState({ date: today, description: "", amount: 0 });
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const account = bankAccounts.find((a) => a.id === accountId) ?? bankAccounts[0];

  useEffect(() => {
    if (!accountId && bankAccounts.length > 0) setAccountId(bankAccounts[0]!.id);
  }, [bankAccounts, accountId]);

  const loadLines = useCallback(async (id: string) => {
    setLines(await listStatementLines(id));
  }, []);
  useEffect(() => {
    if (account) void loadLines(account.id);
  }, [account, loadLines]);

  const txns = account?.transactions ?? [];
  const matched = txns.filter((x) => x.matched).length;
  const unmatched = txns.length - matched;
  const statementTotal = useMemo(() => lines.reduce((s, l) => s + l.amount, 0), [lines]);
  const bookBalance = account?.balance ?? 0;

  async function addLine() {
    if (!account) return;
    if (form.amount === 0) return toast.error(t("Enter a signed amount (+ inflow, − outflow)"));
    setSaving(true);
    try {
      const res = await addStatementLine({ bankAccountId: account.id, date: form.date, description: form.description, amount: form.amount });
      if (!res.ok) return toast.error(res.error);
      toast.success(res.data.matched ? t("Line added · auto-matched to a ledger entry") : t("Line added · no match found"));
      setForm({ date: today, description: "", amount: 0 });
      await loadLines(account.id);
    } finally {
      setSaving(false);
    }
  }

  async function importCsv(file: File) {
    if (!account) return;
    setImporting(true);
    try {
      const rows = parseCsv(await file.text());
      if (rows.length < 2) return toast.error(t("The file has no data rows"));
      const header = rows[0]!.map((h) => h.toLowerCase().trim());
      const find = (...keys: string[]) => header.findIndex((h) => keys.some((k) => h.includes(k)));
      const dateIdx = find("date");
      const descIdx = find("desc", "narration", "detail", "particular");
      const amtIdx = find("amount", "value");
      const crIdx = find("credit", "deposit", "money in");
      const drIdx = find("debit", "withdraw", "money out");
      if (dateIdx < 0 || (amtIdx < 0 && crIdx < 0 && drIdx < 0)) {
        return toast.error(t("Couldn't find date and amount columns in the file"));
      }
      const num = (s: string | undefined) => Number(String(s ?? "").replace(/[^0-9.-]/g, "")) || 0;
      const lines = rows.slice(1)
        .map((r) => ({
          date: normalizeDate(r[dateIdx]),
          description: descIdx >= 0 ? (r[descIdx] ?? "") : "",
          amount: amtIdx >= 0 ? num(r[amtIdx]) : num(r[crIdx]) - num(r[drIdx]),
          reference: "",
        }))
        .filter((l) => l.date && l.amount !== 0);
      if (lines.length === 0) return toast.error(t("No usable statement lines in the file"));
      const res = await importStatementLines({ bankAccountId: account.id, lines });
      if (!res.ok) return toast.error(res.error);
      toast.success(t("Imported {n} lines · {m} auto-matched", { n: res.data.imported, m: res.data.matched }));
      await loadLines(account.id);
    } finally {
      setImporting(false);
    }
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Bank Reconciliation"
        subtitle={account ? `${account.bankName} · ${account.accountName}` : t("Match your bank statement to the ledger")}
        breadcrumbs={[{ label: "Banking", href: "/banking" }, { label: "Reconciliation" }]}
        actions={bankAccounts.length > 0 ? (
          <Select value={account?.id ?? ""} onValueChange={setAccountId} options={bankAccounts.map((a) => ({ value: a.id, label: `${a.bankName} · ${a.accountName}` }))} />
        ) : undefined}
      />

      {bankAccounts.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No bank accounts" description="Add a bank account on the Banking page first, then reconcile its statement here." />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <SummaryCard label={t("Book balance (GL)")} value={<CurrencyDisplay amount={bookBalance} showSymbol={false} />} color="default" />
            <SummaryCard label={t("Statement total")} value={<CurrencyDisplay amount={statementTotal} showSymbol={false} />} color="default" />
            <SummaryCard label={t("Matched")} value={String(matched)} color="success" icon={<CheckCircle2 className="w-5 h-5" />} />
            <SummaryCard label={t("Unmatched")} value={String(unmatched)} color="warning" icon={<AlertTriangle className="w-5 h-5" />} />
          </div>

          <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card mb-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold text-base">{t("Add statement line")}</h3>
              <label className={cn("inline-flex items-center gap-1.5 text-sm font-medium cursor-pointer", importing ? "text-ud-text-muted" : "text-ud-primary hover:underline")}>
                <Upload className="w-4 h-4" /> {importing ? t("Importing…") : t("Import CSV")}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  disabled={importing}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.target.value = ""; }}
                />
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto_auto] gap-2 items-end">
              <Input label={t("Date")} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              <Input label={t("Description")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("e.g. Customer deposit")} />
              <Input label={t("Amount (± )")} type="number" value={String(form.amount)} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) || 0 })} className="text-right font-mono" />
              <Button variant="primary" loading={saving} icon={<Plus className="w-4 h-4" />} onClick={() => void addLine()}>{t("Add")}</Button>
            </div>
            <p className="mt-2 text-xs text-ud-text-muted">{t("Positive = money in (credit), negative = money out (debit). Lines auto-match to the ledger's bank transactions by amount.")}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-ud-border rounded-2xl shadow-card overflow-hidden">
              <div className="px-5 py-3 border-b border-ud-border font-display font-bold text-sm">{t("Ledger bank transactions")}</div>
              <div className="divide-y divide-ud-border max-h-[420px] overflow-y-auto">
                {txns.length === 0 ? <p className="p-5 text-sm text-ud-text-muted">{t("No ledger transactions yet.")}</p> : txns.map((tx) => (
                  <div key={tx.id} className={cn("flex items-center gap-3 px-5 py-3", !tx.matched && "bg-ud-warning-bg/40")}>
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", tx.matched ? "bg-ud-success" : "bg-ud-warning")} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{tx.description}</div>
                      <div className="text-xs text-ud-text-muted font-mono">{formatDate(tx.date)} · {tx.reference}</div>
                    </div>
                    <div className={cn("font-mono text-sm font-medium", tx.credit > 0 ? "text-ud-success" : "text-ud-danger")}>
                      <CurrencyDisplay amount={tx.credit > 0 ? tx.credit : -tx.debit} showSymbol={false} />
                    </div>
                    <Badge variant={tx.matched ? "success" : "warning"} size="sm">{tx.matched ? t("Matched") : t("Unmatched")}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-ud-border rounded-2xl shadow-card overflow-hidden">
              <div className="px-5 py-3 border-b border-ud-border font-display font-bold text-sm">{t("Statement lines")}</div>
              <div className="divide-y divide-ud-border max-h-[420px] overflow-y-auto">
                {lines.length === 0 ? <p className="p-5 text-sm text-ud-text-muted">{t("Add statement lines above to reconcile.")}</p> : lines.map((l) => (
                  <div key={l.id} className={cn("flex items-center gap-3 px-5 py-3", !l.matched && "bg-ud-warning-bg/40")}>
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", l.matched ? "bg-ud-success" : "bg-ud-warning")} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{l.description || t("(no description)")}</div>
                      <div className="text-xs text-ud-text-muted font-mono">{formatDate(l.date)}</div>
                    </div>
                    <div className={cn("font-mono text-sm font-medium", l.amount >= 0 ? "text-ud-success" : "text-ud-danger")}>
                      <CurrencyDisplay amount={l.amount} showSymbol={false} />
                    </div>
                    <Badge variant={l.matched ? "success" : "warning"} size="sm">{l.matched ? t("Matched") : t("Unmatched")}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </PageWrapper>
  );
}

function SummaryCard({ label, value, color, icon }: { label: string; value: React.ReactNode; color: "success" | "warning" | "default"; icon?: React.ReactNode }) {
  const bg = color === "success" ? "bg-ud-success-bg text-ud-success border-ud-success/20" :
             color === "warning" ? "bg-ud-warning-bg text-ud-warning border-ud-warning/20" :
             "bg-white text-ud-text-primary border-ud-border";
  return (
    <div className={`p-4 rounded-2xl border ${bg}`}>
      <div className="flex items-center gap-2">
        {icon}
        <div className="text-xs uppercase tracking-[0.08em] font-semibold">{label}</div>
      </div>
      <div className="mt-2 font-display font-extrabold text-2xl tabular-nums">{value}</div>
    </div>
  );
}
