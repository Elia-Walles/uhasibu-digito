"use client";
import Link from "next/link";
import { Users, Wallet, FileSpreadsheet, Play } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatRowSkeleton } from "@/components/skeletons/StatRowSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { usePayrollRuns } from "@/lib/hooks/usePayrollRuns";
import { formatDate } from "@/lib/utils/dates";
import type { PayrollRun } from "@/types";

const COLS: Column<PayrollRun>[] = [
  { key: "period", label: "Period", sortable: true },
  { key: "totalGross", label: "Gross", sortable: true, align: "right",
    render: (r) => <CurrencyDisplay amount={r.totalGross} compact /> },
  { key: "totalPAYE", label: "PAYE", align: "right", render: (r) => <CurrencyDisplay amount={r.totalPAYE} compact /> },
  { key: "totalNSSF", label: "NSSF", align: "right", render: (r) => <CurrencyDisplay amount={r.totalNSSF} compact /> },
  { key: "totalNet", label: "Net Pay", align: "right", sortable: true,
    render: (r) => <CurrencyDisplay amount={r.totalNet} compact className="font-bold" /> },
  { key: "processedAt", label: "Processed", sortable: true, render: (r) => formatDate(r.processedAt.split("T")[0] ?? "") },
  { key: "status", label: "Status", render: (r) => (
    <Badge variant={r.status === "Paid" ? "success" : r.status === "Processed" ? "info" : "warning"}>{r.status}</Badge>
  ) },
];

export default function PayrollOverviewPage() {
  const { payrollRuns, loading: prLoading } = usePayrollRuns();
  const loading = prLoading;
  const current = payrollRuns[payrollRuns.length - 1];
  return (
    <PageWrapper>
      <PageHeader
        title="Payroll"
        subtitle="Run, review and track employee payroll"
        actions={
          <>
            <Link href="/payroll/employees"><Button variant="outline" icon={<Users className="w-4 h-4" />}>Employees</Button></Link>
            <Link href="/payroll/run-payroll"><Button variant="primary" icon={<Play className="w-4 h-4" />}>Run payroll</Button></Link>
          </>
        }
      />

      {loading ? <StatRowSkeleton /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Gross (latest)"  value={current?.totalGross ?? 0} variant="teal"    icon={<Wallet />} prefix="TSh" format="compact" />
          <StatCard label="PAYE remitted"   value={current?.totalPAYE ?? 0}  variant="amber"   prefix="TSh" format="compact" />
          <StatCard label="NSSF (combined)" value={(current?.totalNSSF ?? 0) * 2} variant="blue" prefix="TSh" format="compact" />
          <StatCard label="Net disbursed"   value={current?.totalNet ?? 0}   variant="emerald" prefix="TSh" format="compact" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-white border border-ud-border rounded-2xl p-5 shadow-card">
          <h3 className="font-display font-bold text-base mb-4">Payroll history</h3>
          {loading ? <TableSkeleton rows={6} columns={7} /> : <DataTable data={payrollRuns.slice().reverse()} columns={COLS} pageSize={10} />}
        </div>
        <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card">
          <h3 className="font-display font-bold text-base mb-4">Statutory due</h3>
          <div className="space-y-3 text-sm">
            {[
              { label: "PAYE",  amount: current?.totalPAYE ?? 0,  due: "2024-11-07" },
              { label: "NSSF",  amount: (current?.totalNSSF ?? 0) * 2, due: "2024-11-07" },
              { label: "SDL",   amount: current?.totalSDL ?? 0,   due: "2024-11-07" },
              { label: "WCF",   amount: current?.totalWCF ?? 0,   due: "2024-11-07" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between py-2 border-b border-ud-border last:border-b-0">
                <div>
                  <div className="font-medium">{s.label}</div>
                  <div className="text-xs text-ud-text-muted">Due {formatDate(s.due)}</div>
                </div>
                <CurrencyDisplay amount={s.amount} compact className="font-bold" />
              </div>
            ))}
            <Link href="/payroll/statutory">
              <Button variant="secondary" fullWidth icon={<FileSpreadsheet className="w-4 h-4" />} className="mt-3">
                Prepare returns
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
