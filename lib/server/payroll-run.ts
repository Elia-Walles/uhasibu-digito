import type { db } from "./db";
import type { RequestContext } from "./request-context";
import { calculateDeductions } from "@/lib/utils/paye";
import { postPayrollRun } from "./gl-postings";

// The interactive-transaction client for the extended `db`.
type Tx = Omit<typeof db, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export interface PayrollRunInput {
  year: number;
  month: number;
  period: string;
}

/**
 * The compound payroll write: in one transaction, fetch the tenant's employees, compute
 * PAYE/NSSF/SDL/WCF/HESLB per employee with the canonical engine (lib/utils/paye.ts), then
 * persist the PayrollRun + a PayrollRunEmployee snapshot per employee. tenantId-scoped
 * explicitly; testable with the raw tx client (mirrors journal-posting.ts).
 */
export async function buildPayrollRun(
  tx: Tx,
  tenantId: string,
  ctx: RequestContext,
  input: PayrollRunInput,
): Promise<{ payrollRunId: string; employeeCount: number }> {
  const employees = await tx.employee.findMany({ where: { tenantId } });
  const computed = employees.map((e) => ({
    employee: e,
    d: calculateDeductions(Number(e.grossSalary), e.hasHeslb),
  }));

  const sum = (pick: (d: ReturnType<typeof calculateDeductions>) => number) =>
    computed.reduce((s, c) => s + pick(c.d), 0);

  const run = await tx.payrollRun.create({
    data: {
      tenantId,
      period: input.period,
      month: input.month,
      year: input.year,
      status: "Paid",
      processedAt: new Date(),
      totalGross: sum((d) => d.grossPay),
      totalPAYE: sum((d) => d.paye),
      totalNSSF: sum((d) => d.nssf_employee),
      totalSDL: sum((d) => d.sdl),
      totalWCF: sum((d) => d.wcf),
      totalNet: sum((d) => d.netPay),
    },
  });

  for (const c of computed) {
    await tx.payrollRunEmployee.create({
      data: {
        tenantId,
        payrollRunId: run.id,
        employeeId: c.employee.id,
        employeeName: c.employee.fullName,
        grossPay: c.d.grossPay,
        paye: c.d.paye,
        nssfEmployee: c.d.nssf_employee,
        nssfEmployer: c.d.nssf_employer,
        wcf: c.d.wcf,
        sdl: c.d.sdl,
        heslb: c.d.heslb,
        netPay: c.d.netPay,
      },
    });
  }

  // Post the payroll journal to the GL so it flows into the statements.
  const gross = sum((d) => d.grossPay);
  if (gross > 0) {
    const reference = `PAY-${input.period}`;
    await postPayrollRun(tx, tenantId, ctx, {
      period: input.period,
      reference,
      date: new Date().toISOString().split("T")[0]!,
      gross,
      paye: sum((d) => d.paye),
      nssfEmployee: sum((d) => d.nssf_employee),
      nssfEmployer: sum((d) => d.nssf_employer),
      sdl: sum((d) => d.sdl),
      wcf: sum((d) => d.wcf),
      heslb: sum((d) => d.heslb),
    });
    await tx.payrollRun.update({ where: { id: run.id }, data: { journalRef: reference } });
  }

  return { payrollRunId: run.id, employeeCount: computed.length };
}
