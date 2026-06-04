import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required"),
  contactPerson: z.string().trim().default(""),
  tin: z.string().trim().default(""),
  phone: z.string().trim().default(""),
  email: z.string().trim().default(""),
  city: z.string().trim().default(""),
  address: z.string().trim().default(""),
  paymentTerms: z.string().trim().default("Net 30"),
  creditLimit: z.number().nonnegative().default(0),
  performanceRating: z.number().min(0).max(5).default(0),
  bankName: z.string().trim().default(""),
  bankAccount: z.string().trim().default(""),
});

export const poLineInputSchema = z.object({
  description: z.string().trim().default(""),
  quantity: z.number(),
  unitPrice: z.number(),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Select a supplier"),
  date: z.string().min(1),
  expectedDelivery: z.string().min(1),
  lines: z.array(poLineInputSchema).min(1, "Add at least one line item"),
});

export const updatePOMatchSchema = z.object({
  id: z.string().min(1),
  poConfirmed: z.boolean().optional(),
  grnReceived: z.boolean().optional(),
  invoiceReceived: z.boolean().optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
