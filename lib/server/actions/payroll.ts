"use server";
import type {
  Employee as DbEmployee,
  EmployeeAllowance as DbAllowance,
  PayrollRun as DbPayrollRun,
  PayrollRunEmployee as DbPayrollLine,
} from "@prisma/client";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import { buildPayrollRun } from "@/lib/server/payroll-run";
import {
  employeeInputSchema,
  createPayrollRunSchema,
  updatePayrollRunStatusSchema,
} from "@/lib/server/schemas/payroll";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum, dateOnly, iso } from "@/lib/server/serialize";
import type {
  Employee,
  AllowanceLine,
  EmploymentType,
  EmployeeStatus,
  PayrollRun,
  PayrollRunStatus,
  PayrollDeductions,
} from "@/types";

type DbEmployeeWithAllowances = DbEmployee & { allowances: DbAllowance[] };
type DbPayrollLineWithEmployee = DbPayrollLine & { employee: DbEmployeeWithAllowances | null };
type DbPayrollRunWithLines = DbPayrollRun & { lines: DbPayrollLineWithEmployee[] };

function rowToAllowance(a: DbAllowance): AllowanceLine {
  return { id: a.id, label: a.label, amount: decToNum(a.amount), taxable: a.taxable };
}

function rowToEmployee(e: DbEmployeeWithAllowances): Employee {
  return {
    id: e.id,
    employeeNumber: e.employeeNumber,
    firstName: e.firstName,
    lastName: e.lastName,
    fullName: e.fullName,
    department: e.department,
    position: e.position,
    employmentType: e.employmentType as EmploymentType,
    startDate: dateOnly(e.startDate),
    basicSalary: decToNum(e.basicSalary),
    housingAllowance: decToNum(e.housingAllowance),
    transportAllowance: decToNum(e.transportAllowance),
    otherAllowances: decToNum(e.otherAllowances),
    grossSalary: decToNum(e.grossSalary),
    nssf: e.nssf,
    tin: e.tin,
    bankName: e.bankName,
    bankAccount: e.bankAccount,
    phone: e.phone,
    email: e.email,
    status: e.status as EmployeeStatus,
    leaveBalance: decToNum(e.leaveBalance),
    hasHeslb: e.hasHeslb,
    allowances: e.allowances.map(rowToAllowance),
    ...(e.overtimeRate !== null ? { overtimeRate: decToNum(e.overtimeRate) } : {}),
    ...(e.overtimeHoursDefault !== null ? { overtimeHoursDefault: decToNum(e.overtimeHoursDefault) } : {}),
  };
}

function stubEmployee(id: string, name: string): Employee {
  const [firstName = name, lastName = ""] = name.split(" ");
  return {
    id,
    employeeNumber: "",
    firstName,
    lastName,
    fullName: name,
    department: "",
    position: "",
    employmentType: "Permanent",
    startDate: "",
    basicSalary: 0,
    housingAllowance: 0,
    transportAllowance: 0,
    otherAllowances: 0,
    grossSalary: 0,
    nssf: "",
    tin: "",
    bankName: "",
    bankAccount: "",
    phone: "",
    email: "",
    status: "Active",
    leaveBalance: 0,
    hasHeslb: false,
    allowances: [],
  };
}

function rowToPayrollRun(r: DbPayrollRunWithLines): PayrollRun {
  return {
    id: r.id,
    period: r.period,
    month: r.month,
    year: r.year,
    status: r.status as PayrollRunStatus,
    processedAt: iso(r.processedAt ?? r.createdAt),
    totalGross: decToNum(r.totalGross),
    totalPAYE: decToNum(r.totalPAYE),
    totalNSSF: decToNum(r.totalNSSF),
    totalSDL: decToNum(r.totalSDL),
    totalWCF: decToNum(r.totalWCF),
    totalNet: decToNum(r.totalNet),
    employees: r.lines.map((line) => {
      const base = line.employee
        ? rowToEmployee(line.employee)
        : stubEmployee(line.employeeId ?? "", line.employeeName);
      const deductions: PayrollDeductions = {
        grossPay: decToNum(line.grossPay),
        paye: decToNum(line.paye),
        nssf_employee: decToNum(line.nssfEmployee),
        nssf_employer: decToNum(line.nssfEmployer),
        wcf: decToNum(line.wcf),
        sdl: decToNum(line.sdl),
        heslb: decToNum(line.heslb),
        netPay: decToNum(line.netPay),
      };
      return { ...base, ...deductions };
    }),
  };
}

// ---------- Employees ----------

export async function listEmployees(): Promise<Employee[]> {
  return withAuth(async () => {
    const rows = await db.employee.findMany({
      orderBy: { employeeNumber: "asc" },
      include: { allowances: true },
    });
    return rows.map(rowToEmployee);
  });
}

function employeeData(ctx: { tenantId: string }, d: ReturnType<typeof employeeInputSchema.parse>, employeeNumber: string) {
  return {
    tenantId: ctx.tenantId,
    employeeNumber,
    firstName: d.firstName,
    lastName: d.lastName,
    fullName: d.fullName || `${d.firstName} ${d.lastName}`,
    department: d.department,
    position: d.position,
    employmentType: d.employmentType,
    startDate: d.startDate ? new Date(d.startDate) : new Date(),
    basicSalary: d.basicSalary,
    housingAllowance: d.housingAllowance,
    transportAllowance: d.transportAllowance,
    otherAllowances: d.otherAllowances,
    grossSalary: d.grossSalary,
    nssf: d.nssf,
    tin: d.tin,
    bankName: d.bankName,
    bankAccount: d.bankAccount,
    phone: d.phone,
    email: d.email,
    status: d.status,
    leaveBalance: d.leaveBalance,
    hasHeslb: d.hasHeslb,
    ...(d.overtimeRate !== undefined ? { overtimeRate: d.overtimeRate } : {}),
    ...(d.overtimeHoursDefault !== undefined ? { overtimeHoursDefault: d.overtimeHoursDefault } : {}),
  };
}

export async function createEmployee(input: unknown): Promise<Result<Employee>> {
  const parsed = employeeInputSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  const employeeNumber = d.employeeNumber || `EMP-${String(Date.now()).slice(-5)}`;
  return withAuth(async (ctx) => {
    const clash = await db.employee.findFirst({ where: { employeeNumber } });
    if (clash) return err(`Employee number ${employeeNumber} already exists`);
    const created = await db.employee.create({
      data: {
        ...employeeData(ctx, d, employeeNumber),
        allowances: { create: d.allowances.map((a) => ({ tenantId: ctx.tenantId, label: a.label, amount: a.amount, taxable: a.taxable })) },
      },
      include: { allowances: true },
    });
    return ok(rowToEmployee(created));
  });
}

export async function updateEmployee(input: unknown): Promise<Result<Employee>> {
  // `id` rides on the raw input; the employee shape strips it (zod drops unknown keys).
  const id = typeof (input as { id?: unknown })?.id === "string" ? (input as { id: string }).id : "";
  if (!id) return err("Missing employee id");
  const parsed = employeeInputSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  return withAuth(async (ctx) => {
    const existing = await db.employee.findFirst({ where: { id } });
    if (!existing) return err("Employee not found");
    const updated = await db.$transaction(async (tx) => {
      await tx.employeeAllowance.deleteMany({ where: { employeeId: id, tenantId: ctx.tenantId } });
      return tx.employee.update({
        where: { id },
        data: {
          ...employeeData(ctx, d, d.employeeNumber || existing.employeeNumber),
          allowances: { create: d.allowances.map((a) => ({ tenantId: ctx.tenantId, label: a.label, amount: a.amount, taxable: a.taxable })) },
        },
        include: { allowances: true },
      });
    });
    return ok(rowToEmployee(updated));
  });
}

export async function deleteEmployee(input: { id: string }): Promise<Result<{ id: string }>> {
  const id = input?.id;
  if (!id) return err("Missing employee id");
  return withAuth(async () => {
    try {
      await db.employee.delete({ where: { id } });
      return ok({ id });
    } catch {
      return err("Employee not found");
    }
  });
}

// ---------- Payroll runs ----------

export async function listPayrollRuns(): Promise<PayrollRun[]> {
  return withAuth(async () => {
    const rows = await db.payrollRun.findMany({
      orderBy: [{ year: "asc" }, { month: "asc" }],
      include: { lines: { include: { employee: { include: { allowances: true } } } } },
    });
    return rows.map(rowToPayrollRun);
  });
}

export async function createPayrollRun(input: unknown): Promise<Result<{ id: string; period: string }>> {
  const parsed = createPayrollRunSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const p = parsed.data;
  return withAuth(async (ctx) => {
    const existing = await db.payrollRun.findFirst({ where: { period: p.period } });
    if (existing) return err(`Payroll for ${p.period} has already been processed`);
    const result = await db.$transaction((tx) => buildPayrollRun(tx, ctx.tenantId, ctx, p));
    return ok({ id: result.payrollRunId, period: p.period });
  });
}

export async function updatePayrollRunStatus(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = updatePayrollRunStatusSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, status } = parsed.data;
  return withAuth(async () => {
    try {
      await db.payrollRun.update({ where: { id }, data: { status } });
      return ok({ id });
    } catch {
      return err("Payroll run not found");
    }
  });
}
