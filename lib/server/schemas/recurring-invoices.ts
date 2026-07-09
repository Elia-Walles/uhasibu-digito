import { z } from "zod";
import { invoiceLineInputSchema } from "@/lib/server/schemas/invoices";

export const recurringFrequencySchema = z.enum(["Weekly", "Monthly", "Quarterly", "Yearly"]);

export const createRecurringInvoiceSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  frequency: recurringFrequencySchema.default("Monthly"),
  interval: z.number().int().positive().default(1),
  startDate: z.string().min(1), // YYYY-MM-DD — the first run date
  endDate: z.string().optional(),
  active: z.boolean().default(true),
  notes: z.string().default(""),
  lines: z.array(invoiceLineInputSchema).min(1, "Add at least one line item"),
});

export const updateRecurringInvoiceSchema = z.object({
  id: z.string().min(1),
  customerId: z.string().optional(),
  frequency: recurringFrequencySchema.optional(),
  interval: z.number().int().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  active: z.boolean().optional(),
  notes: z.string().optional(),
  lines: z.array(invoiceLineInputSchema).min(1).optional(),
});

export const recurringIdSchema = z.object({ id: z.string().min(1) });

export type CreateRecurringInvoiceInput = z.infer<typeof createRecurringInvoiceSchema>;
export type UpdateRecurringInvoiceInput = z.infer<typeof updateRecurringInvoiceSchema>;
