import { z } from "zod";

const PROCEDURE = z.enum(["Expenses", "Purchases", "Sales"]);
const STATUS = z.enum(["Pending", "Passed", "Exception"]);

export const setAuditStepSchema = z.object({
  procedure: PROCEDURE,
  stepKey: z.string().min(1),
  status: STATUS,
  notes: z.string().default(""),
});

export const resetProcedureSchema = z.object({
  procedure: PROCEDURE,
});

// Patch the engagement card updates one field at a time (name / period / auditor).
export const updateEngagementSchema = z.object({
  name: z.string().optional(),
  period: z.string().optional(),
  auditorName: z.string().optional(),
});
