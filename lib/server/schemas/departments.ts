import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(1, "Department name is required"),
});

export const renameDepartmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Department name is required"),
});

export const departmentIdSchema = z.object({
  id: z.string().min(1),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type RenameDepartmentInput = z.infer<typeof renameDepartmentSchema>;
