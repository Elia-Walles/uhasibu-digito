"use client";
import { useState, useEffect, useMemo } from "react";
import { Save, Scale } from "lucide-react";
import toast from "react-hot-toast";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { useCOA } from "@/lib/hooks/useCOA";
import { getOpeningBalances, postOpeningBalances } from "@/lib/server/actions/opening-balances";
import { formatTZS } from "@/lib/utils/currency";
import { useT } from "@/lib/hooks/useT";

const DEBIT_NORMAL = new Set(["Asset", "Expense", "CostOfSales"]);

export default function OpeningBalancesPage() {
  const t = useT();
  const { accounts, loading } = useCOA();
  const [asAt, setAsAt] = useState(new Date().toISOString().split("T")[0]!);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Only childless (leaf) accounts, excluding the Opening Balance Equity plug itself.
  const leaves = useMemo(() => {
    const parents = new Set(accounts.map((a) => a.parentCode).filter(Boolean) as string[]);
    return accounts.filter((a) => !parents.has(a.code) && a.code !== "3900");
  }, [accounts]);

  useEffect(() => {
    if (loaded) return;
    void getOpeningBalances().then((res) => {
      if (res.asAtDate) setAsAt(res.asAtDate);
      const map: Record<string, number> = {};
      for (const b of res.balances) map[b.accountCode] = b.amount;
      setAmounts(map);
      setLoaded(true);
    });
  }, [loaded]);

  const typeByCode = useMemo(() => new Map(accounts.map((a) => [a.code, a.type])), [accounts]);
  const equityPlug = useMemo(() => {
    let netDebit = 0;
    for (const [code, amt] of Object.entries(amounts)) {
      if (!amt) continue;
      const debitNormal = DEBIT_NORMAL.has(typeByCode.get(code) ?? "Asset");
      netDebit += debitNormal ? amt : -amt;
    }
    return Math.round(netDebit * 100) / 100;
  }, [amounts, typeByCode]);

  async function post() {
    const lines = Object.entries(amounts).filter(([, v]) => v !== 0).map(([accountCode, amount]) => ({ accountCode, amount }));
    if (lines.length === 0) return toast.error(t("Enter at least one opening balance"));
    setSaving(true);
    try {
      const res = await postOpeningBalances({ asAtDate: asAt, lines });
      if (!res.ok) return toast.error(res.error);
      toast.success(t("Opening balances posted to the ledger"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Opening Balances"
        subtitle="Enter go-live balances per account — the difference balances to Opening Balance Equity"
        breadcrumbs={[{ label: "General Ledger", href: "/general-ledger" }, { label: "Opening balances" }]}
        actions={<Button variant="primary" icon={<Save className="w-4 h-4" />} loading={saving} onClick={() => void post()}>{t("Post opening balances")}</Button>}
      />

      <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card mb-5 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <Input label={t("As at date")} type="date" value={asAt} onChange={(e) => setAsAt(e.target.value)} />
        <div className="sm:col-span-2 flex items-center gap-2 rounded-xl bg-ud-surface-2 px-4 py-3">
          <Scale className="w-4 h-4 text-ud-primary" />
          <span className="text-sm text-ud-text-muted">{t("Balances to Opening Balance Equity:")}</span>
          <span className={`ml-auto font-mono font-semibold ${equityPlug >= 0 ? "text-ud-success" : "text-ud-danger"}`}>
            {equityPlug >= 0 ? t("Credit") : t("Debit")} {formatTZS(Math.abs(equityPlug))}
          </span>
        </div>
      </div>

      {loading ? <TableSkeleton rows={12} columns={3} /> : (
        <div className="bg-white border border-ud-border rounded-2xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ud-surface-2 text-xs uppercase tracking-[0.06em] text-ud-text-secondary">
                <tr>
                  <th className="text-left px-4 py-3" scope="col">{t("Code")}</th>
                  <th className="text-left px-4 py-3" scope="col">{t("Account")}</th>
                  <th className="text-left px-4 py-3" scope="col">{t("Type")}</th>
                  <th className="text-right px-4 py-3 w-48" scope="col">{t("Opening balance")}</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((a, i) => (
                  <tr key={a.code} className={i % 2 === 1 ? "bg-ud-surface-2/50" : ""}>
                    <td className="px-4 py-2 font-mono text-xs">{a.code}</td>
                    <td className="px-4 py-2 font-medium">{a.name}</td>
                    <td className="px-4 py-2 text-ud-text-muted">{a.type}{DEBIT_NORMAL.has(a.type) ? " (Dr+)" : " (Cr+)"}</td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        value={amounts[a.code] ? String(amounts[a.code]) : ""}
                        onChange={(e) => setAmounts((m) => ({ ...m, [a.code]: Number(e.target.value) || 0 }))}
                        className="text-right font-mono"
                        placeholder="0"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="mt-3 text-xs text-ud-text-muted">{t("Enter each balance in its natural direction (assets & expenses positive; liabilities, equity & income positive as credits). Re-posting replaces the previous opening entry.")}</p>
    </PageWrapper>
  );
}
