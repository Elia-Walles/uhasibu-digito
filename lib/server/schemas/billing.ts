import { z } from "zod";

// The paid tiers a user can be invoiced for (mirrors selectPlanSchema / admin planSchema).
export const PLAN_KEYS = ["starter", "business", "standard", "premium"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export const createSubscriptionInvoiceSchema = z.object({
  planKey: z.enum(PLAN_KEYS),
  interval: z.enum(["year", "month"]).default("year"),
});

export const subscriptionInvoiceIdSchema = z.object({
  invoiceId: z.string().min(1, "Invoice id is required"),
});

export const subscriptionInvoiceIdsSchema = z.object({
  invoiceIds: z.array(z.string().min(1)).min(1, "Select at least one invoice"),
});
