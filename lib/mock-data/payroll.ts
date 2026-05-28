import type { PayrollRun, Employee, PayrollDeductions } from "@/types";
import { EMPLOYEES } from "./employees";
import { calculateDeductions } from "@/lib/utils/paye";

const MONTHS = [
  { period: "May 2024",       month: 5,  year: 2024 },
  { period: "June 2024",      month: 6,  year: 2024 },
  { period: "July 2024",      month: 7,  year: 2024 },
  { period: "August 2024",    month: 8,  year: 2024 },
  { period: "September 2024", month: 9,  year: 2024 },
  { period: "October 2024",   month: 10, year: 2024 },
];

function buildRun(period: string, month: number, year: number, idx: number): PayrollRun {
  const enriched = EMPLOYEES.map((e) => {
    const d = calculateDeductions(e.grossSalary, e.hasHeslb);
    return { ...e, ...d };
  }) as (Employee & PayrollDeductions)[];

  const totalGross = enriched.reduce((s, e) => s + e.grossPay, 0);
  const totalPAYE  = enriched.reduce((s, e) => s + e.paye, 0);
  const totalNSSF  = enriched.reduce((s, e) => s + e.nssf_employee, 0);
  const totalSDL   = enriched.reduce((s, e) => s + e.sdl, 0);
  const totalWCF   = enriched.reduce((s, e) => s + e.wcf, 0);
  const totalNet   = enriched.reduce((s, e) => s + e.netPay, 0);

  return {
    id: `pr_${year}${String(month).padStart(2, "0")}`,
    period,
    month,
    year,
    status: idx < 5 ? "Paid" : "Draft",
    processedAt: new Date(year, month - 1, 28).toISOString(),
    totalGross,
    totalPAYE,
    totalNSSF,
    totalSDL,
    totalWCF,
    totalNet,
    employees: enriched,
  };
}

export const PAYROLL_RUNS: PayrollRun[] = MONTHS.map((m, i) =>
  buildRun(m.period, m.month, m.year, i)
);

export const CURRENT_PAYROLL = PAYROLL_RUNS[PAYROLL_RUNS.length - 1]!;
