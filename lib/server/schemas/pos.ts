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

const paymentMethod = z.enum(["mpesa", "cash", "card"]);

export const recordPOSSaleSchema = z.object({
  branchId: z.string().trim().optional(),
  paymentMethod,
  customerName: z.string().trim().optional(),
  discount: z.number().min(0).optional(),
  lines: z
    .array(
      z.object({
        itemId: z.string().min(1),
        quantity: z.number().positive(),
        unitPrice: z.number().min(0),
      }),
    )
    .min(1, "Add at least one item to the sale"),
});
export type RecordPOSSaleInput = z.infer<typeof recordPOSSaleSchema>;

export const posAnalyticsFilterSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  branchId: z.string().optional(),
  paymentMethod: paymentMethod.optional(),
});
export type POSAnalyticsFilter = z.infer<typeof posAnalyticsFilterSchema>;
