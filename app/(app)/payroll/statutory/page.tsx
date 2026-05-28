"use client";
import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { DigitalStamp } from "@/components/ui/DigitalStamp";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { useLoadingSimulation } from "@/lib/hooks/useLoadingSimulation";
import { CURRENT_PAYROLL } from "@/lib/mock-data/payroll";
import type { StampData } from "@/types";

type TabKey = "paye" | "nssf" | "sdl" | "wcf";

export default function StatutoryPage() {
  const loading = useLoadingSimulation(800);
  const [tab, setTab] = useState<TabKey>("paye");
  const [stamp, setStamp] = useState<StampData | null>(null);

  const totalMap: Record<TabKey, { label: string; rate: string; total: number; description: string }> = {
    paye: { label: "PAYE",  rate: "0% / 8% / 20% / 25% / 30%", total: CURRENT_PAYROLL.totalPAYE,  description: "Pay-As-You-Earn — remitted to TRA on behalf of employees." },
    nssf: { label: "NSSF",  rate: "10% employee + 10% employer", total: CURRENT_PAYROLL.totalNSSF * 2, description: "National Social Security Fund contribution." },
    sdl:  { label: "SDL",   rate: "4% of gross",  total: CURRENT_PAYROLL.totalSDL,   description: "Skills Development Levy paid by the employer." },
    wcf:  { label: "WCF",   rate: "0.5% of gross", total: CURRENT_PAYROLL.totalWCF,   description: "Workers' Compensation Fund." },
  };
  const meta = totalMap[tab];

  return (
    <PageWrapper>
      <PageHeader
        title={`Statutory returns — ${CURRENT_PAYROLL.period}`}
        subtitle="Prepare and stamp PAYE, NSSF, SDL, and WCF returns for TRA filing"
        breadcrumbs={[{ label: "Payroll", href: "/payroll" }, { label: "Statutory" }]}
        actions={<ExportMenu fileLabel={`${meta.label} return`} />}
      />

      <div className="bg-white border border-ud-border rounded-2xl shadow-card mb-6">
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as TabKey)}
          tabs={[
            { value: "paye", label: "PAYE" },
            { value: "nssf", label: "NSSF" },
            { value: "sdl",  label: "SDL" },
            { value: "wcf",  label: "WCF" },
          ]}
        />
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card label="Total payable" value={<CurrencyDisplay amount={meta.total} className="text-xl font-display font-extrabold" />} accent="teal" />
            <Card label="Rate" value={<span className="font-mono text-xs">{meta.rate}</span>} />
            <Card label="Filing deadline" value={<span className="font-medium">7 November 2024</span>} accent="warning" />
          </div>

          <p className="text-sm text-ud-text-muted mb-5">{meta.description}</p>

          {loading ? <TableSkeleton rows={6} columns={4} /> : (
            <div className="overflow-x-auto rounded-xl border border-ud-border">
              <table className="w-full text-sm">
                <thead className="bg-ud-surface-2 text-xs uppercase tracking-[0.06em] text-ud-text-secondary">
                  <tr>
                    <th className="text-left px-4 py-3" scope="col">Employee</th>
                    <th className="text-left px-4 py-3" scope="col">TIN</th>
                    <th className="text-right px-4 py-3" scope="col">Gross</th>
                    <th className="text-right px-4 py-3" scope="col">{meta.label}</th>
                  </tr>
                </thead>
                <tbody>
                  {CURRENT_PAYROLL.employees.map((e, i) => {
                    const amt = tab === "paye" ? e.paye :
                                tab === "nssf" ? e.nssf_employee + e.nssf_employer :
                                tab === "sdl"  ? e.sdl :
                                e.wcf;
                    return (
                      <tr key={e.id} className={i % 2 === 1 ? "bg-ud-surface-2/50" : ""}>
                        <td className="px-4 py-2.5 font-medium">{e.fullName}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-ud-text-muted">{e.tin}</td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums"><CurrencyDisplay amount={e.grossPay} compact showSymbol={false} /></td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums font-medium"><CurrencyDisplay amount={amt} compact showSymbol={false} /></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-ud-primary text-white">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 font-bold">Total {meta.label} payable</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-bold">
                      <CurrencyDisplay amount={meta.total} compact showSymbol={false} />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-start gap-4">
            <DigitalStamp documentName={`${meta.label} Return — ${CURRENT_PAYROLL.period}`} onApply={setStamp} applied={stamp} />
            {!stamp && (
              <p className="text-xs text-ud-text-muted max-w-md">
                Apply the NBAA digital stamp to certify this statutory return before submission to TRA.
              </p>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

function Card({ label, value, accent }: { label: string; value: React.ReactNode; accent?: "teal" | "warning" }) {
  const accentClass = accent === "teal"    ? "border-ud-primary-100 bg-ud-primary-50" :
                      accent === "warning" ? "border-ud-warning/20 bg-ud-warning-bg" :
                      "border-ud-border bg-white";
  return (
    <div className={`p-4 rounded-xl border ${accentClass}`}>
      <div className="text-[10px] uppercase tracking-[0.08em] font-semibold text-ud-text-secondary">{label}</div>
      <div className="mt-2">{value}</div>
    </div>
  );
}
