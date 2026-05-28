"use client";
import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { DigitalStamp } from "@/components/ui/DigitalStamp";
import { StatementTable } from "@/components/ui/StatementTable";
import { BALANCE_SHEET } from "@/lib/mock-data/financial-statements";
import type { StampData } from "@/types";

export default function BalanceSheetPage() {
  const [stamp, setStamp] = useState<StampData | null>(null);
  const [showStamp, setShowStamp] = useState(false);
  return (
    <PageWrapper>
      <PageHeader
        title="Balance Sheet"
        subtitle="Statement of financial position as at 31 October 2024"
        breadcrumbs={[{ label: "Financial Statements", href: "/financial-statements" }, { label: "Balance Sheet" }]}
        actions={<ExportMenu onApplyStamp={() => setShowStamp(true)} fileLabel="Balance Sheet" />}
      />
      <div className="bg-white border border-ud-border rounded-2xl p-6 shadow-card">
        <div className="text-center mb-5">
          <div className="text-xs uppercase tracking-[0.08em] font-semibold text-ud-text-muted">Kilimanjaro Trading Company Limited</div>
          <h2 className="font-display font-extrabold text-2xl mt-1">Balance Sheet</h2>
          <div className="text-sm text-ud-text-muted mt-1">As at 31 October 2024 (TZS)</div>
        </div>
        <StatementTable lines={BALANCE_SHEET} currentLabel="31 Oct 2024" priorLabel="31 Oct 2023" />
        {stamp && <div className="mt-6"><DigitalStamp documentName="Balance Sheet — Oct 2024" applied={stamp} /></div>}
        {showStamp && !stamp && <div className="mt-6"><DigitalStamp documentName="Balance Sheet — Oct 2024" onApply={setStamp} /></div>}
      </div>
    </PageWrapper>
  );
}
