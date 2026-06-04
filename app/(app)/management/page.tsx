"use client";
import { useEffect, useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { getManagementMetrics, type ManagementMetrics } from "@/lib/server/actions/analytics";

export default function ManagementAccountingPage() {
  const [m, setM] = useState<ManagementMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getManagementMetrics().then((data) => {
      if (!active) return;
      setM(data);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <PageWrapper>
      <PageHeader title="Management Accounts" subtitle="Margins and profitability from your live ledger" />

      {loading || !m ? (
        <p className="text-sm text-ud-text-muted">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard label="Gross margin" value={Number(m.grossMargin.toFixed(1))} suffix="%" variant="teal" format="raw" />
            <StatCard label="Operating margin" value={Number(m.operatingMargin.toFixed(1))} suffix="%" variant="emerald" format="raw" />
            <StatCard label="Net margin" value={Number(m.netMargin.toFixed(1))} suffix="%" variant="blue" format="raw" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card">
              <div className="text-xs uppercase tracking-[0.08em] text-ud-text-muted mb-1">Revenue (FY)</div>
              <CurrencyDisplay amount={m.revenue} className="text-2xl font-display font-extrabold" />
            </div>
            <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card">
              <div className="text-xs uppercase tracking-[0.08em] text-ud-text-muted mb-1">Net profit (FY)</div>
              <CurrencyDisplay amount={m.netProfit} className="text-2xl font-display font-extrabold" />
            </div>
          </div>

          {m.revenue === 0 && (
            <p className="mt-4 text-sm text-ud-text-muted">
              Post sales and expenses to the general ledger and your margins will populate here.
            </p>
          )}
        </>
      )}
    </PageWrapper>
  );
}
