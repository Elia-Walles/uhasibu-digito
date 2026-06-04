import { z } from "zod";

const allowanceLineSchema = z.object({
  id: z.string().default(""),
  label: z.string().default(""),
  amount: z.number().default(0),
  taxable: z.boolean().default(true),
});

export const employeeInputSchema = z.object({
  employeeNumber: z.string().default(""),
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  fullName: z.string().default(""),
  department: z.string().min(1, "Department is required"),
  position: z.string().default(""),
  employmentType: z.enum(["Permanent", "Contract"]).default("Permanent"),
  startDate: z.string().default(""),
  basicSalary: z.number().default(0),
  housingAllowance: z.number().default(0),
  transportAllowance: z.number().default(0),
  otherAllowances: z.number().default(0),
  grossSalary: z.number().default(0),
  nssf: z.string().default(""),
  tin: z.string().default(""),
  bankName: z.string().default(""),
  bankAccount: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  status: z.enum(["Active", "Inactive"]).default("Active"),
  leaveBalance: z.number().default(0),
  hasHeslb: z.boolean().default(false),
  allowances: z.array(allowanceLineSchema).default([]),
  overtimeRate: z.number().optional(),
  overtimeHoursDefault: z.number().optional(),
});

export const createPayrollRunSchema = z.object({
  year: z.number(),
  month: z.number(),
  period: z.string().min(1),
});

export const updatePayrollRunStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["Draft", "Processed", "Paid"]),
});

export type EmployeeInput = z.infer<typeof employeeInputSchema>;
