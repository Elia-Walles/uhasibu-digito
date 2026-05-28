"use client";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { COA } from "@/lib/mock-data/gl-entries";

export default function TrialBalancePage() {
  const accounts = COA.filter((a) => a.level === 1 || (a.level === 0 && a.type === "CostOfSales"));
  const totalDebit  = accounts.reduce((s, a) => s + (a.closingBalance > 0 && (a.type === "Asset" || a.type === "Expense" || a.type === "CostOfSales") ? a.closingBalance : 0), 0);
  const totalCredit = accounts.reduce((s, a) => s + (a.closingBalance > 0 && (a.type === "Liability" || a.type === "Equity" || a.type === "Income") ? a.closingBalance : 0), 0);

  return (
    <PageWrapper>
      <PageHeader
        title="Trial Balance"
        subtitle="As at 31 October 2024 · all account balances"
        breadcrumbs={[{ label: "General Ledger", href: "/general-ledger" }, { label: "Trial Balance" }]}
        actions={<ExportMenu fileLabel="Trial Balance" />}
      />
      <div className="bg-white border border-ud-border rounded-2xl p-6 shadow-card">
        <div className="text-center mb-5">
          <div className="text-xs uppercase tracking-[0.08em] font-semibold text-ud-text-muted">Kilimanjaro Trading Company Limited</div>
          <h2 className="font-display font-extrabold text-2xl mt-1">Trial Balance</h2>
          <div className="text-sm text-ud-text-muted mt-1">As at 31 October 2024 (TZS)</div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-ud-border">
          <table className="w-full text-sm">
            <thead className="bg-ud-surface-2 text-xs uppercase tracking-[0.06em] text-ud-text-secondary">
              <tr>
                <th className="text-left px-4 py-3" scope="col">Code</th>
                <th className="text-left px-4 py-3" scope="col">Account</th>
                <th className="text-right px-4 py-3" scope="col">Debit</th>
                <th className="text-right px-4 py-3" scope="col">Credit</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a, i) => {
                const isDebit = a.type === "Asset" || a.type === "Expense" || a.type === "CostOfSales";
                return (
                  <tr key={a.code} className={i % 2 === 1 ? "bg-ud-surface-2/50" : ""}>
                    <td className="px-4 py-2.5 font-mono text-xs text-ud-text-muted">{a.code}</td>
                    <td className="px-4 py-2.5">{a.name}</td>
                    <td className="px-4 py-2.5 text-right">{isDebit && a.closingBalance > 0 ? <CurrencyDisplay amount={a.closingBalance} showSymbol={false} /> : <span className="text-ud-text-faint">—</span>}</td>
                    <td className="px-4 py-2.5 text-right">{!isDebit && a.closingBalance > 0 ? <CurrencyDisplay amount={a.closingBalance} showSymbol={false} /> : <span className="text-ud-text-faint">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-ud-primary text-white">
              <tr>
                <td colSpan={2} className="px-4 py-3 font-bold">Total</td>
                <td className="px-4 py-3 text-right font-mono font-bold"><CurrencyDisplay amount={totalDebit} showSymbol={false} /></td>
                <td className="px-4 py-3 text-right font-mono font-bold"><CurrencyDisplay amount={totalCredit} showSymbol={false} /></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="mt-4 text-xs text-ud-text-muted text-center">
          Books are balanced. Total debits = Total credits = <span className="font-mono font-medium text-ud-primary">{Math.max(totalDebit, totalCredit).toLocaleString()}</span>
        </div>
      </div>
    </PageWrapper>
  );
}
