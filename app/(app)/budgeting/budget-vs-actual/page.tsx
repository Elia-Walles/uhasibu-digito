"use client";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { Badge } from "@/components/ui/Badge";
import { BudgetVarianceChart } from "@/components/charts/BudgetVarianceChart";
import { BUDGET_LINES } from "@/lib/mock-data/budgets";

export default function BudgetVsActualPage() {
  return (
    <PageWrapper>
      <PageHeader
        title="Budget vs Actual"
        subtitle="Variance analysis · favourable shown as green, unfavourable as red"
        breadcrumbs={[{ label: "Budgeting", href: "/budgeting" }, { label: "Variance" }]}
      />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        <div className="lg:col-span-3 bg-white border border-ud-border rounded-2xl p-5 shadow-card">
          <h3 className="font-display font-bold text-base mb-3">YTD variance by line item</h3>
          <BudgetVarianceChart />
        </div>
        <div className="lg:col-span-2 bg-white border border-ud-border rounded-2xl p-5 shadow-card">
          <h3 className="font-display font-bold text-base mb-3">Worst performers</h3>
          <div className="space-y-2">
            {[...BUDGET_LINES].sort((a, b) => a.ytdVariance - b.ytdVariance).slice(0, 5).map((b) => (
              <div key={b.id} className="flex items-center justify-between p-2 rounded-xl bg-ud-surface-2">
                <div>
                  <div className="text-sm font-medium">{b.lineItem}</div>
                  <div className="text-xs text-ud-text-muted">{b.category}</div>
                </div>
                <CurrencyDisplay amount={b.ytdVariance} compact className="font-bold" colored />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white border border-ud-border rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ud-surface-2 text-xs uppercase tracking-[0.06em] text-ud-text-secondary">
              <tr>
                <th className="text-left px-4 py-3" scope="col">Line item</th>
                <th className="text-left px-4 py-3" scope="col">Category</th>
                <th className="text-right px-4 py-3" scope="col">Annual budget</th>
                <th className="text-right px-4 py-3" scope="col">YTD budget</th>
                <th className="text-right px-4 py-3" scope="col">YTD actual</th>
                <th className="text-right px-4 py-3" scope="col">Variance</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {BUDGET_LINES.map((b, i) => (
                <tr key={b.id} className={i % 2 === 1 ? "bg-ud-surface-2/50" : ""}>
                  <td className="px-4 py-2.5 font-medium">{b.lineItem}</td>
                  <td className="px-4 py-2.5"><Badge size="sm" variant="default">{b.category}</Badge></td>
                  <td className="px-4 py-2.5 text-right"><CurrencyDisplay amount={b.annualBudget} showSymbol={false} /></td>
                  <td className="px-4 py-2.5 text-right text-ud-text-muted"><CurrencyDisplay amount={b.ytdBudget} showSymbol={false} /></td>
                  <td className="px-4 py-2.5 text-right"><CurrencyDisplay amount={b.ytdActual} showSymbol={false} /></td>
                  <td className="px-4 py-2.5 text-right"><CurrencyDisplay amount={b.ytdVariance} showSymbol={false} className="font-medium" colored /></td>
                  <td className="px-4 py-2.5">
                    {b.ytdVariance < 0
                      ? <Badge size="sm" variant="danger">Over</Badge>
                      : <Badge size="sm" variant="success">Under</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrapper>
  );
}
