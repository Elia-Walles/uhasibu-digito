"use client";
import { useMemo, useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { DigitalStamp } from "@/components/ui/DigitalStamp";
import { StatementTable } from "@/components/ui/StatementTable";
import { PeriodSelector } from "@/components/ui/PeriodSelector";
import { ComplianceStatement } from "@/components/ui/ComplianceStatement";
import { CashFlowChart } from "@/components/charts/CashFlowChart";
import { buildPeriodView, describePeriodFor, type StatementPeriod } from "@/lib/utils/statements";
import type { StampData } from "@/types";

export default function CashFlowPage() {
  const [period, setPeriod] = useState<StatementPeriod>("Q3");
  const [stamp, setStamp] = useState<StampData | null>(null);
  const [showStamp, setShowStamp] = useState(false);
  const view = useMemo(() => buildPeriodView(period), [period]);

  return (
    <PageWrapper>
      <PageHeader
        title="Cash Flow Statement"
        subtitle={`Operating, investing, and financing cash flows · ${describePeriodFor(period)}`}
        breadcrumbs={[{ label: "Financial Statements", href: "/financial-statements" }, { label: "Cash Flow" }]}
        actions={<ExportMenu onApplyStamp={() => setShowStamp(true)} fileLabel="Cash Flow" />}
      />
      <div className="mb-4"><PeriodSelector value={period} onValueChange={setPeriod} /></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-white border border-ud-border rounded-2xl p-6 shadow-card">
          <div className="text-center mb-5">
            <div className="text-xs uppercase tracking-[0.08em] font-semibold text-ud-text-muted">Kilimanjaro Trading Company Limited</div>
            <h2 className="font-display font-extrabold text-2xl mt-1">Cash Flow Statement</h2>
            <div className="text-sm text-ud-text-muted mt-1">{describePeriodFor(period)} (TZS)</div>
          </div>
          <StatementTable lines={view.cashFlow} currentLabel={view.currentLabel} priorLabel={view.priorLabel} />
          {stamp && <div className="mt-6"><DigitalStamp documentName={`Cash Flow Statement — ${view.currentLabel}`} applied={stamp} /></div>}
          {showStamp && !stamp && <div className="mt-6"><DigitalStamp documentName={`Cash Flow Statement — ${view.currentLabel}`} onApply={setStamp} /></div>}
        </div>
        <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card">
          <h3 className="font-display font-bold text-base mb-3">Cash bridge</h3>
          <CashFlowChart height={320} />
        </div>
      </div>
      <ComplianceStatement />
    </PageWrapper>
  );
}
