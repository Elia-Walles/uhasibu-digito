import { z } from "zod";

// ── Identifiers (also the security gate for read-only drill-downs) ──
export const tenantIdSchema = z.object({ tenantId: z.string().min(1, "Tenant is required") });
export const userIdSchema = z.object({ userId: z.string().min(1, "User is required") });

// ── Tenants ──
export const createTenantSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers and hyphens"),
  tier: z.enum(["free", "starter", "business", "enterprise"]).default("free"),
});

export const updateTenantSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().trim().min(1).optional(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers and hyphens")
    .optional(),
});

export const setTenantTierSchema = z.object({
  tenantId: z.string().min(1),
  tier: z.enum(["free", "starter", "business", "enterprise"]),
});

// ── Users ──
export const updateUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["Admin", "CFO", "Finance Manager", "Accountant", "Data Entry", "HR Manager", "Auditor"]),
});

// ── Super-admin grants ──
export const grantSuperAdminSchema = z.object({ userId: z.string().min(1) });

// ── Plans ──
export const planSchema = z.object({
  key: z.enum(["starter", "business", "enterprise"]),
  name: z.string().trim().min(1, "Name is required"),
  tagline: z.string().trim().default(""),
  priceTzs: z.number().nonnegative("Price cannot be negative"),
  interval: z.enum(["year", "month"]).default("year"),
  features: z.array(z.string().trim().min(1)).default([]),
  isActive: z.boolean().default(true),
  highlighted: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const updatePlanSchema = planSchema.partial().extend({ id: z.string().min(1) });
export const togglePlanSchema = z.object({ id: z.string().min(1), isActive: z.boolean() });

// ── Subscriptions ──
export const upsertSubscriptionSchema = z.object({
  tenantId: z.string().min(1),
  planKey: z.enum(["starter", "business", "enterprise"]),
  amountTzs: z.number().nonnegative(),
  currentPeriodEnd: z.coerce.date().optional(),
});

export const subscriptionIdSchema = z.object({ subscriptionId: z.string().min(1) });

// ── Payments ──
export const recordPaymentSchema = z.object({
  tenantId: z.string().min(1),
  subscriptionId: z.string().min(1).optional(),
  amountTzs: z.number().positive("Amount must be greater than zero"),
  method: z.enum(["manual", "mpesa", "bank", "cash"]).default("manual"),
  reference: z.string().trim().default(""),
  paidAt: z.coerce.date(),
  note: z.string().trim().default(""),
});

export const paymentIdSchema = z.object({ paymentId: z.string().min(1) });

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type PlanInput = z.infer<typeof planSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
