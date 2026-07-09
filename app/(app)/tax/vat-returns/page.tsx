"use client";
import { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { DigitalStamp } from "@/components/ui/DigitalStamp";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { useVATReturns } from "@/lib/hooks/useVATReturns";
import { getVatGlReconciliation, type VatGlReconciliation } from "@/lib/server/actions/tax";
import { useT } from "@/lib/hooks/useT";
import { formatTZS } from "@/lib/utils/currency";
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
  const tr = useT();
  const { vatReturns } = useVATReturns();
  const VAT_RETURN_OCT = vatReturns[0] ?? EMPTY_VAT;
  const [tab, setTab] = useState("summary");
  const [stamp, setStamp] = useState<StampData | null>(null);
  const [recon, setRecon] = useState<VatGlReconciliation | null>(null);

  useEffect(() => { void getVatGlReconciliation().then(setRecon); }, []);
  const reconciled = recon ? Math.abs(recon.glOutput - recon.returnOutput) < 1 && Math.abs(recon.glInput - recon.returnInput) < 1 : false;

  return (
    <PageWrapper>
      <PageHeader
        title={tr("VAT Return {period}", { period: VAT_RETURN_OCT.period })}
        subtitle="Due 20 November 2024 · 14-day filing window"
        breadcrumbs={[{ label: "Tax", href: "/tax" }, { label: "VAT Returns" }]}
        actions={<ExportMenu fileLabel="VAT Return" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Card label={tr("Output VAT (sales)")}    amount={VAT_RETURN_OCT.outputVAT} color="teal" />
        <Card label={tr("− Input VAT (purchases)")} amount={VAT_RETURN_OCT.inputVAT}  color="info" />
        <Card label={tr("Net payable to TRA")}     amount={VAT_RETURN_OCT.vatPayable} color="warning" />
      </div>

      {recon && (
        <div className={`mb-6 rounded-2xl border px-5 py-4 ${reconciled ? "bg-ud-success-bg border-ud-success/20" : "bg-ud-warning-bg border-ud-warning/20"}`}>
          <div className="flex items-center gap-2 mb-2">
            {reconciled ? <CheckCircle2 className="w-4 h-4 text-ud-success" /> : <AlertTriangle className="w-4 h-4 text-ud-warning" />}
            <span className={`text-sm font-semibold ${reconciled ? "text-ud-success" : "text-ud-warning"}`}>
              {reconciled ? tr("VAT returns reconcile to the general ledger") : tr("VAT returns vs the general ledger — review")}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <ReconCell label={tr("GL output VAT (2200)")} value={recon.glOutput} />
            <ReconCell label={tr("Returns output VAT")} value={recon.returnOutput} />
            <ReconCell label={tr("GL input VAT (1250)")} value={recon.glInput} />
            <ReconCell label={tr("Returns input VAT")} value={recon.returnInput} />
          </div>
        </div>
      )}

      <div className="bg-white border border-ud-border rounded-2xl shadow-card">
        <Tabs
          value={tab}
          onValueChange={setTab}
          tabs={[
            { value: "summary", label: "Summary" },
            { value: "output",  label: tr("Output ({count})", { count: VAT_RETURN_OCT.outputTransactions.length }) },
            { value: "input",   label: tr("Input ({count})", { count: VAT_RETURN_OCT.inputTransactions.length }) },
          ]}
        />
        <div className="p-6">
          {tab === "summary" && (
            <div className="space-y-3 text-sm">
              <Row label={tr("Output VAT (18% of sales)")}     value={VAT_RETURN_OCT.outputVAT} />
              <Row label={tr("Input VAT (claimable)")}         value={-VAT_RETURN_OCT.inputVAT} />
              <div className="divider-hairline" />
              <Row label={tr("NET VAT PAYABLE TO TRA")} value={VAT_RETURN_OCT.vatPayable} bold />
            </div>
          )}

          {(tab === "output" || tab === "input") && (
            <div className="overflow-x-auto rounded-xl border border-ud-border">
              <table className="w-full text-sm">
                <thead className="bg-ud-surface-2 text-xs uppercase tracking-[0.06em] text-ud-text-secondary">
                  <tr>
                    <th className="text-left px-4 py-3" scope="col">{tr("Date")}</th>
                    <th className="text-left px-4 py-3" scope="col">{tr("Reference")}</th>
                    <th className="text-left px-4 py-3" scope="col">{tr("Description")}</th>
                    <th className="text-right px-4 py-3" scope="col">{tr("Net")}</th>
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
            <DigitalStamp documentName={tr("VAT Return {period}", { period: VAT_RETURN_OCT.period })} onApply={setStamp} applied={stamp} />
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

function ReconCell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-ud-text-muted">{label}</div>
      <div className="font-mono font-semibold tabular-nums">{formatTZS(value)}</div>
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
