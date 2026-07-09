import { z } from "zod";

export const quotationLineInputSchema = z.object({
  description: z.string().trim().default(""),
  quantity: z.number(),
  unitPrice: z.number(),
  discountPct: z.number().default(0),
  vatPct: z.number().default(18),
});

export const createQuotationSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  date: z.string().min(1),
  validUntil: z.string().min(1),
  notes: z.string().default(""),
  status: z.enum(["Draft", "Sent"]).default("Draft"),
  lines: z.array(quotationLineInputSchema).min(1, "Add at least one line item"),
});

// Manual status changes only — "Converted" is set exclusively by convertQuotation (atomic).
export const updateQuotationStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["Draft", "Sent", "Accepted", "Expired"]),
});

export const convertQuotationSchema = z.object({
  quotationId: z.string().min(1),
});

export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;
