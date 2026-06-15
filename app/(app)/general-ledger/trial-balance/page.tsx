"use client";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { EmptyState } from "@/components/ui/EmptyState";
import { Scale } from "lucide-react";
import { useTrialBalance } from "@/lib/hooks/useTrialBalance";
import { useT } from "@/lib/hooks/useT";

export default function TrialBalancePage() {
  const t = useT();
  const router = useRouter();
  const { data, loading } = useTrialBalance();

  return (
    <PageWrapper>
      <PageHeader
        title="Trial Balance"
        subtitle={data ? `As at ${data.asAt} · all account balances` : "All account balances"}
        breadcrumbs={[{ label: "General Ledger", href: "/general-ledger" }, { label: "Trial Balance" }]}
        actions={<ExportMenu fileLabel="Trial Balance" />}
      />
      <div className="bg-white border border-ud-border rounded-2xl p-6 shadow-card">
        <div className="text-center mb-5">
          <div className="text-xs uppercase tracking-[0.08em] font-semibold text-ud-text-muted">{data?.companyName ?? ""}</div>
          <h2 className="font-display font-extrabold text-2xl mt-1">{t("Trial Balance")}</h2>
          <div className="text-sm text-ud-text-muted mt-1">{data ? t("As at {date}", { date: data.asAt }) : ""} (TZS)</div>
        </div>

        {loading ? (
          <p className="text-sm text-ud-text-muted text-center py-8">{t("Loading…")}</p>
        ) : !data || data.rows.length === 0 ? (
          <EmptyState
            icon={Scale}
            title="No posted balances yet"
            description="Post journal entries in the General Ledger and they'll roll up into the trial balance here."
            action={{ label: "Go to Journal Entry", onClick: () => router.push("/general-ledger/journal-entry") }}
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-ud-border">
              <table className="w-full text-sm">
                <thead className="bg-ud-surface-2 text-xs uppercase tracking-[0.06em] text-ud-text-secondary">
                  <tr>
                    <th className="text-left px-4 py-3" scope="col">{t("Code")}</th>
                    <th className="text-left px-4 py-3" scope="col">{t("Account")}</th>
                    <th className="text-right px-4 py-3" scope="col">{t("Debit")}</th>
                    <th className="text-right px-4 py-3" scope="col">{t("Credit")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((a, i) => (
                    <tr key={a.code} className={i % 2 === 1 ? "bg-ud-surface-2/50" : ""}>
                      <td className="px-4 py-2.5 font-mono text-xs text-ud-text-muted">{a.code}</td>
                      <td className="px-4 py-2.5">{a.name}</td>
                      <td className="px-4 py-2.5 text-right">{a.debit > 0 ? <CurrencyDisplay amount={a.debit} showSymbol={false} /> : <span className="text-ud-text-faint"></span>}</td>
                      <td className="px-4 py-2.5 text-right">{a.credit > 0 ? <CurrencyDisplay amount={a.credit} showSymbol={false} /> : <span className="text-ud-text-faint"></span>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-ud-primary text-white">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 font-bold">{t("Total")}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold"><CurrencyDisplay amount={data.totalDebit} showSymbol={false} /></td>
                    <td className="px-4 py-3 text-right font-mono font-bold"><CurrencyDisplay amount={data.totalCredit} showSymbol={false} /></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="mt-4 text-xs text-ud-text-muted text-center">
              {data.totalDebit === data.totalCredit
                ? <>{t("Books are balanced. Total debits = total credits =")} <span className="font-mono font-medium text-ud-primary">{data.totalDebit.toLocaleString()}</span></>
                : <span className="text-ud-danger">{t("Out of balance by {amount}", { amount: Math.abs(data.totalDebit - data.totalCredit).toLocaleString() })}</span>}
            </div>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
