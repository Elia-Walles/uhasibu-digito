"use client";
import { useMemo, useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { DigitalStamp } from "@/components/ui/DigitalStamp";
import { StatementTable } from "@/components/ui/StatementTable";
import { PeriodSelector } from "@/components/ui/PeriodSelector";
import { ComplianceStatement } from "@/components/ui/ComplianceStatement";
import { buildPeriodView, describePeriodAsAt, type StatementPeriod } from "@/lib/utils/statements";
import type { StampData } from "@/types";

export default function BalanceSheetPage() {
  const [period, setPeriod] = useState<StatementPeriod>("Q3");
  const [stamp, setStamp] = useState<StampData | null>(null);
  const [showStamp, setShowStamp] = useState(false);
  const view = useMemo(() => buildPeriodView(period), [period]);

  return (
    <PageWrapper>
      <PageHeader
        title="Balance Sheet"
        subtitle={`Statement of financial position · ${describePeriodAsAt(period)}`}
        breadcrumbs={[{ label: "Financial Statements", href: "/financial-statements" }, { label: "Balance Sheet" }]}
        actions={<ExportMenu onApplyStamp={() => setShowStamp(true)} fileLabel="Balance Sheet" />}
      />
      <div className="mb-4"><PeriodSelector value={period} onValueChange={setPeriod} /></div>
      <div className="bg-white border border-ud-border rounded-2xl p-6 shadow-card">
        <div className="text-center mb-5">
          <div className="text-xs uppercase tracking-[0.08em] font-semibold text-ud-text-muted">Kilimanjaro Trading Company Limited</div>
          <h2 className="font-display font-extrabold text-2xl mt-1">Balance Sheet</h2>
          <div className="text-sm text-ud-text-muted mt-1">{describePeriodAsAt(period)} (TZS)</div>
        </div>
        <StatementTable lines={view.balanceSheet} currentLabel={view.currentLabel} priorLabel={view.priorLabel} />
        {stamp && <div className="mt-6"><DigitalStamp documentName={`Balance Sheet — ${view.currentLabel}`} applied={stamp} /></div>}
        {showStamp && !stamp && <div className="mt-6"><DigitalStamp documentName={`Balance Sheet — ${view.currentLabel}`} onApply={setStamp} /></div>}
      </div>
      <ComplianceStatement />
    </PageWrapper>
  );
}
