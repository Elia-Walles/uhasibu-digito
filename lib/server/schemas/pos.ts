import { z } from "zod";

export const createBranchSchema = z.object({
  name: z.string().trim().min(1, "Branch name is required"),
  code: z.string().trim().optional(),
  region: z.string().trim().optional(),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  isPrimary: z.boolean().optional(),
});
export type CreateBranchInput = z.infer<typeof createBranchSchema>;

export const updateBranchSchema = createBranchSchema.partial().extend({
  id: z.string().min(1),
});
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;

const paymentMethod = z.enum(["mpesa", "cash", "card"]);

const saleLine = z.object({
  itemId: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
});

export const recordPOSSaleSchema = z.object({
  branchId: z.string().trim().optional(),
  paymentMethod,
  customerId: z.string().trim().optional(),
  customerName: z.string().trim().optional(),
  paymentRef: z.string().trim().optional(),
  discountAmount: z.number().min(0).optional(),
  amountTendered: z.number().min(0).optional(),
  lines: z.array(saleLine).min(1, "Add at least one item to the sale"),
});
export type RecordPOSSaleInput = z.infer<typeof recordPOSSaleSchema>;

export const refundPOSSaleSchema = z.object({ saleId: z.string().min(1) });
export type RefundPOSSaleInput = z.infer<typeof refundPOSSaleSchema>;

export const createPOSInvoiceSchema = z.object({
  customerId: z.string().trim().optional(),
  customerName: z.string().trim().min(1, "Customer name is required"),
  branchId: z.string().trim().optional(),
  discountAmount: z.number().min(0).optional(),
  lines: z.array(saleLine).min(1, "Add at least one item to the invoice"),
});
export type CreatePOSInvoiceInput = z.infer<typeof createPOSInvoiceSchema>;

export const posAnalyticsFilterSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  branchId: z.string().optional(),
  paymentMethod: paymentMethod.optional(),
});
export type POSAnalyticsFilter = z.infer<typeof posAnalyticsFilterSchema>;
