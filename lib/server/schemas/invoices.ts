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
  quotationId: z.string().optional(), // set when converting a quotation (marks it Converted atomically)
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

export const recordInvoicePaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive("Enter a payment amount"),
  method: z.string().trim().default("Bank Transfer"),
  reference: z.string().trim().default(""),
  paidAt: z.string().optional(), // YYYY-MM-DD
});

export const updateInvoiceFullSchema = z.object({
  id: z.string().min(1),
  customerId: z.string().min(1, "Select a customer"),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  notes: z.string().default(""),
  lines: z.array(invoiceLineInputSchema).min(1, "Add at least one line item"),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceStatusInput = z.infer<typeof updateInvoiceStatusSchema>;
export type SendInvoiceInput = z.infer<typeof sendInvoiceSchema>;
export type RecordInvoicePaymentInput = z.infer<typeof recordInvoicePaymentSchema>;
export type UpdateInvoiceFullInput = z.infer<typeof updateInvoiceFullSchema>;
