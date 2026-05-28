"use client";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { useLoadingSimulation } from "@/lib/hooks/useLoadingSimulation";
import { BUDGET_LINES } from "@/lib/mock-data/budgets";

export default function BudgetingPage() {
  const loading = useLoadingSimulation(800);

  return (
    <PageWrapper>
      <PageHeader
        title="Budgeting"
        subtitle="Annual budget · YTD utilization by line item"
        actions={<Link href="/budgeting/budget-vs-actual"><Button variant="primary" icon={<BarChart3 className="w-4 h-4" />}>Variance analysis</Button></Link>}
      />

      {loading ? <CardGridSkeleton count={12} cols={3} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BUDGET_LINES.map((b) => {
            const util = (b.ytdActual / b.ytdBudget) * 100;
            const overspent = util > 100;
            const variant = overspent ? "danger" : util > 90 ? "warning" : "teal";
            return (
              <div key={b.id} className="bg-white border border-ud-border rounded-2xl p-4 shadow-card">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-sm">{b.lineItem}</div>
                    <div className="text-xs text-ud-text-muted">{b.category}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-mono font-bold ${overspent ? "text-ud-danger" : ""}`}>{util.toFixed(0)}%</div>
                  </div>
                </div>
                <ProgressBar value={Math.min(util, 100)} variant={variant} />
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-ud-text-muted">YTD actual</div>
                    <CurrencyDisplay amount={b.ytdActual} compact className="font-medium" />
                  </div>
                  <div>
                    <div className="text-ud-text-muted">YTD budget</div>
                    <CurrencyDisplay amount={b.ytdBudget} compact className="font-medium" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
