"use client";
import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { DigitalStamp } from "@/components/ui/DigitalStamp";
import { StatementTable } from "@/components/ui/StatementTable";
import { Select } from "@/components/ui/Select";
import { INCOME_STATEMENT } from "@/lib/mock-data/financial-statements";
import type { StampData } from "@/types";

export default function IncomeStatementPage() {
  const [period, setPeriod] = useState("2024-oct");
  const [stamp, setStamp] = useState<StampData | null>(null);
  const [showStamp, setShowStamp] = useState(false);

  return (
    <PageWrapper>
      <PageHeader
        title="Income Statement"
        subtitle="Profit & loss for the period ended 31 October 2024"
        breadcrumbs={[{ label: "Financial Statements", href: "/financial-statements" }, { label: "Income Statement" }]}
        actions={
          <>
            <div className="w-48"><Select
              value={period}
              onValueChange={setPeriod}
              options={[
                { value: "2024-oct", label: "Oct 2024 vs Oct 2023" },
                { value: "2024-q3",  label: "Q3 2024 vs Q3 2023" },
                { value: "2024-ytd", label: "YTD 2024 vs YTD 2023" },
              ]}
            /></div>
            <ExportMenu onApplyStamp={() => setShowStamp(true)} fileLabel="Income Statement" />
          </>
        }
      />

      <div className="bg-white border border-ud-border rounded-2xl p-6 shadow-card mb-6">
        <div className="text-center mb-5">
          <div className="text-xs uppercase tracking-[0.08em] font-semibold text-ud-text-muted">Kilimanjaro Trading Company Limited</div>
          <h2 className="font-display font-extrabold text-2xl text-ud-text-primary mt-1">Income Statement</h2>
          <div className="text-sm text-ud-text-muted mt-1">For the period ended 31 October 2024 (TZS)</div>
        </div>

        <StatementTable lines={INCOME_STATEMENT} currentLabel="Oct 2024" priorLabel="Oct 2023" />

        {stamp && (
          <div className="mt-6">
            <DigitalStamp documentName="Income Statement — Oct 2024" applied={stamp} />
          </div>
        )}

        {showStamp && !stamp && (
          <div className="mt-6">
            <DigitalStamp documentName="Income Statement — Oct 2024" onApply={setStamp} />
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
