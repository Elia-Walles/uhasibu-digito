import { z } from "zod";

export const invoiceLineInputSchema = z.object({
  description: z.string().trim().default(""),
  quantity: z.number(),
  unitPrice: z.number(),
  discountPct: z.number().default(0),
  vatPct: z.number().default(18),
});

export const createInvoiceSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  issueDate: z.string().min(1), // YYYY-MM-DD
  dueDate: z.string().min(1),
  notes: z.string().default(""),
  status: z.enum(["Draft", "Sent", "Paid"]).default("Draft"),
  paidAt: z.string().optional(), // ISO; set for POS Paid sales
  lines: z.array(invoiceLineInputSchema).min(1, "Add at least one line item"),
});

export const updateInvoiceStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["Draft", "Sent", "Paid", "Overdue", "Cancelled"]),
});

export const sendInvoiceSchema = z.object({
  invoiceId: z.string().min(1),
  channel: z.enum(["Email", "WhatsApp", "Both"]),
  recipient: z.string().default(""),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceStatusInput = z.infer<typeof updateInvoiceStatusSchema>;
export type SendInvoiceInput = z.infer<typeof sendInvoiceSchema>;
