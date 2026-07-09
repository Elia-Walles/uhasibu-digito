import { z } from "zod";

// All UserRole values (kept in sync with types/index.ts). "Admin" is the owner and isn't invited,
// but is accepted in updates so an owner can promote a manager.
const ROLE_VALUES = [
  "Admin",
  "CFO",
  "Finance Manager",
  "Accountant",
  "Data Entry",
  "HR Manager",
  "Auditor",
  "Branch Manager",
  "Cashier",
] as const;

export const inviteStaffSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.email("Enter a valid email address"),
  role: z.enum(ROLE_VALUES),
  branchId: z.string().trim().optional(),
});

export const updateStaffSchema = z.object({
  id: z.string().min(1),
  role: z.enum(ROLE_VALUES).optional(),
  branchId: z.union([z.string().trim(), z.literal("")]).optional(),
});

export const setStaffDisabledSchema = z.object({
  id: z.string().min(1),
  disabled: z.boolean(),
});

export const staffIdSchema = z.object({ id: z.string().min(1) });
