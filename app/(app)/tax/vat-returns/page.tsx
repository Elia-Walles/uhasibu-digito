"use client";
import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { DigitalStamp } from "@/components/ui/DigitalStamp";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { useVATReturns } from "@/lib/hooks/useVATReturns";
import { formatDate } from "@/lib/utils/dates";
import type { StampData, VATReturn } from "@/types";

const EMPTY_VAT: VATReturn = {
  period: "",
  outputVAT: 0,
  inputVAT: 0,
  vatPayable: 0,
  outputTransactions: [],
  inputTransactions: [],
};

export default function VATReturnsPage() {
  const { vatReturns } = useVATReturns();
  const VAT_RETURN_OCT = vatReturns[0] ?? EMPTY_VAT;
  const [tab, setTab] = useState("summary");
  const [stamp, setStamp] = useState<StampData | null>(null);

  return (
    <PageWrapper>
      <PageHeader
        title={`VAT Return ${VAT_RETURN_OCT.period}`}
        subtitle="Due 20 November 2024 · 14-day filing window"
        breadcrumbs={[{ label: "Tax", href: "/tax" }, { label: "VAT Returns" }]}
        actions={<ExportMenu fileLabel="VAT Return" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Card label="Output VAT (sales)"    amount={VAT_RETURN_OCT.outputVAT} color="teal" />
        <Card label="− Input VAT (purchases)" amount={VAT_RETURN_OCT.inputVAT}  color="info" />
        <Card label="Net payable to TRA"     amount={VAT_RETURN_OCT.vatPayable} color="warning" />
      </div>

      <div className="bg-white border border-ud-border rounded-2xl shadow-card">
        <Tabs
          value={tab}
          onValueChange={setTab}
          tabs={[
            { value: "summary", label: "Summary" },
            { value: "output",  label: `Output (${VAT_RETURN_OCT.outputTransactions.length})` },
            { value: "input",   label: `Input (${VAT_RETURN_OCT.inputTransactions.length})` },
          ]}
        />
        <div className="p-6">
          {tab === "summary" && (
            <div className="space-y-3 text-sm">
              <Row label="Output VAT (18% of sales)"     value={VAT_RETURN_OCT.outputVAT} />
              <Row label="Input VAT (claimable)"         value={-VAT_RETURN_OCT.inputVAT} />
              <div className="divider-hairline" />
              <Row label="NET VAT PAYABLE TO TRA" value={VAT_RETURN_OCT.vatPayable} bold />
            </div>
          )}

          {(tab === "output" || tab === "input") && (
            <div className="overflow-x-auto rounded-xl border border-ud-border">
              <table className="w-full text-sm">
                <thead className="bg-ud-surface-2 text-xs uppercase tracking-[0.06em] text-ud-text-secondary">
                  <tr>
                    <th className="text-left px-4 py-3" scope="col">Date</th>
                    <th className="text-left px-4 py-3" scope="col">Reference</th>
                    <th className="text-left px-4 py-3" scope="col">Description</th>
                    <th className="text-right px-4 py-3" scope="col">Net</th>
                    <th className="text-right px-4 py-3" scope="col">VAT (18%)</th>
                  </tr>
                </thead>
                <tbody>
                  {(tab === "output" ? VAT_RETURN_OCT.outputTransactions : VAT_RETURN_OCT.inputTransactions).map((t, i) => (
                    <tr key={i} className={i % 2 === 1 ? "bg-ud-surface-2/50" : ""}>
                      <td className="px-4 py-2.5 text-ud-text-muted">{formatDate(t.date)}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{t.reference}</td>
                      <td className="px-4 py-2.5">{t.description}</td>
                      <td className="px-4 py-2.5 text-right"><CurrencyDisplay amount={t.netAmount} showSymbol={false} /></td>
                      <td className="px-4 py-2.5 text-right font-medium"><CurrencyDisplay amount={t.vatAmount} showSymbol={false} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6">
            <DigitalStamp documentName={`VAT Return ${VAT_RETURN_OCT.period}`} onApply={setStamp} applied={stamp} />
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

function Card({ label, amount, color }: { label: string; amount: number; color: "teal" | "info" | "warning" }) {
  const bg = color === "teal" ? "bg-ud-primary-50 border-ud-primary-100 text-ud-primary" :
             color === "info" ? "bg-ud-info-bg border-ud-info/20 text-ud-info" :
             "bg-ud-warning-bg border-ud-warning/20 text-ud-warning";
  return (
    <div className={`p-4 rounded-xl border ${bg}`}>
      <div className="text-xs uppercase tracking-[0.06em] font-semibold opacity-75">{label}</div>
      <div className="mt-2 font-display font-extrabold text-xl tabular-nums"><CurrencyDisplay amount={amount} /></div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between items-center ${bold ? "py-3 font-bold text-base" : "py-1"}`}>
      <span>{label}</span>
      <CurrencyDisplay amount={value} className={bold ? "text-xl" : ""} />
    </div>
  );
}
