"use client";
import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { DigitalStamp } from "@/components/ui/DigitalStamp";
import { StatementTable } from "@/components/ui/StatementTable";
import { EQUITY_CHANGES } from "@/lib/mock-data/financial-statements";
import type { StampData } from "@/types";

export default function EquityChangesPage() {
  const [stamp, setStamp] = useState<StampData | null>(null);
  const [showStamp, setShowStamp] = useState(false);
  return (
    <PageWrapper>
      <PageHeader
        title="Statement of Changes in Equity"
        subtitle="Movement in equity for the period ended 31 October 2024"
        breadcrumbs={[{ label: "Financial Statements", href: "/financial-statements" }, { label: "Equity" }]}
        actions={<ExportMenu onApplyStamp={() => setShowStamp(true)} fileLabel="Equity Changes" />}
      />
      <div className="bg-white border border-ud-border rounded-2xl p-6 shadow-card">
        <div className="text-center mb-5">
          <div className="text-xs uppercase tracking-[0.08em] font-semibold text-ud-text-muted">Kilimanjaro Trading Company Limited</div>
          <h2 className="font-display font-extrabold text-2xl mt-1">Statement of Changes in Equity</h2>
          <div className="text-sm text-ud-text-muted mt-1">For the period ended 31 October 2024 (TZS)</div>
        </div>
        <StatementTable lines={EQUITY_CHANGES} currentLabel="Oct 2024" priorLabel="Oct 2023" />
        {stamp && <div className="mt-6"><DigitalStamp documentName="Equity Changes — Oct 2024" applied={stamp} /></div>}
        {showStamp && !stamp && <div className="mt-6"><DigitalStamp documentName="Equity Changes — Oct 2024" onApply={setStamp} /></div>}
      </div>
    </PageWrapper>
  );
}
