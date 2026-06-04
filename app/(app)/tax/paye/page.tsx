"use client";
import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { DigitalStamp } from "@/components/ui/DigitalStamp";
import { Badge } from "@/components/ui/Badge";
import { usePayrollRuns } from "@/lib/hooks/usePayrollRuns";
import type { StampData, PayrollRun } from "@/types";

const EMPTY_RUN: PayrollRun = {
  id: "", period: "—", month: 0, year: 0, status: "Draft", processedAt: "",
  totalGross: 0, totalPAYE: 0, totalNSSF: 0, totalSDL: 0, totalWCF: 0, totalNet: 0, employees: [],
};

export default function PAYEReturnPage() {
  const { payrollRuns } = usePayrollRuns();
  const CURRENT_PAYROLL = payrollRuns[payrollRuns.length - 1] ?? EMPTY_RUN;
  const [stamp, setStamp] = useState<StampData | null>(null);
  return (
    <PageWrapper>
      <PageHeader
        title={`PAYE Return — ${CURRENT_PAYROLL.period}`}
        subtitle="Pay-As-You-Earn remittance to TRA · Due 7 November 2024"
        breadcrumbs={[{ label: "Tax", href: "/tax" }, { label: "PAYE" }]}
        actions={<ExportMenu fileLabel="PAYE Return" />}
      />
      <div className="bg-white border border-ud-border rounded-2xl p-6 shadow-card">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-4 rounded-xl bg-ud-primary-50 border border-ud-primary-100">
            <div className="text-xs uppercase tracking-[0.06em] font-semibold text-ud-primary opacity-75">Total Gross</div>
            <div className="mt-2 font-display font-extrabold text-xl text-ud-primary tabular-nums"><CurrencyDisplay amount={CURRENT_PAYROLL.totalGross} compact /></div>
          </div>
          <div className="p-4 rounded-xl bg-ud-danger-bg border border-ud-danger/20">
            <div className="text-xs uppercase tracking-[0.06em] font-semibold text-ud-danger opacity-75">PAYE Withheld</div>
            <div className="mt-2 font-display font-extrabold text-xl text-ud-danger tabular-nums"><CurrencyDisplay amount={CURRENT_PAYROLL.totalPAYE} compact /></div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-ud-border">
            <div className="text-xs uppercase tracking-[0.06em] font-semibold text-ud-text-secondary">Employees</div>
            <div className="mt-2 font-display font-extrabold text-xl tabular-nums">{CURRENT_PAYROLL.employees.length}</div>
          </div>
          <div className="p-4 rounded-xl bg-ud-warning-bg border border-ud-warning/20">
            <div className="text-xs uppercase tracking-[0.06em] font-semibold text-ud-warning opacity-75">Status</div>
            <div className="mt-2"><Badge variant="warning" size="md">Pending submission</Badge></div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-ud-border">
          <table className="w-full text-sm">
            <thead className="bg-ud-surface-2 text-xs uppercase tracking-[0.06em] text-ud-text-secondary">
              <tr>
                <th className="text-left px-4 py-3" scope="col">Employee</th>
                <th className="text-left px-4 py-3" scope="col">TIN</th>
                <th className="text-right px-4 py-3" scope="col">Gross</th>
                <th className="text-right px-4 py-3" scope="col">PAYE (TZS)</th>
              </tr>
            </thead>
            <tbody>
              {CURRENT_PAYROLL.employees.map((e, i) => (
                <tr key={e.id} className={i % 2 === 1 ? "bg-ud-surface-2/50" : ""}>
                  <td className="px-4 py-2.5 font-medium">{e.fullName}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{e.tin}</td>
                  <td className="px-4 py-2.5 text-right"><CurrencyDisplay amount={e.grossPay} showSymbol={false} /></td>
                  <td className="px-4 py-2.5 text-right font-medium"><CurrencyDisplay amount={e.paye} showSymbol={false} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-ud-primary text-white">
              <tr>
                <td colSpan={2} className="px-4 py-3 font-bold">Total PAYE payable</td>
                <td className="px-4 py-3 text-right font-mono font-bold"><CurrencyDisplay amount={CURRENT_PAYROLL.totalGross} showSymbol={false} /></td>
                <td className="px-4 py-3 text-right font-mono font-bold"><CurrencyDisplay amount={CURRENT_PAYROLL.totalPAYE} showSymbol={false} /></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-6">
          <DigitalStamp documentName={`PAYE Return — ${CURRENT_PAYROLL.period}`} onApply={setStamp} applied={stamp} />
        </div>
      </div>
    </PageWrapper>
  );
}
