// Subscription tiers the single source of truth for SaaS packaging and module gating.
//
// This module is EDGE-SAFE: it has no node-only imports, so it can be imported by
// auth.config.ts (which runs in the edge proxy) as well as by client components and
// server actions. Keep it pure (types + constants + plain functions).

export type Tier = "free" | "starter" | "business" | "standard" | "premium";
export type BillingInterval = "year" | "month";

/** Ordering for "at least this tier" comparisons. `free` = signed up, no plan chosen yet. */
export const TIER_RANK: Record<Tier, number> = {
  free: -1,
  starter: 0,
  business: 1,
  standard: 2,
  premium: 3,
};

/** Annual discount when customers choose yearly billing (17% off vs. paying monthly ×12). */
export const ANNUAL_DISCOUNT_PERCENT = 17;

/** Derives the monthly-equivalent price from the canonical annual price, so that
 *  annual = monthly × 12 × (1 − ANNUAL_DISCOUNT_PERCENT / 100).
 *  Rounded to the nearest 100 TZS for a clean displayed number. */
export function getMonthlyPriceTzs(annualPriceTzs: number): number {
  const raw = annualPriceTzs / 12 / (1 - ANNUAL_DISCOUNT_PERCENT / 100);
  return Math.round(raw / 100) * 100;
}

/** The four purchasable plans, in display order. Prices are TZS / year. */
export interface Plan {
  id: Exclude<Tier, "free">;
  name: string;
  priceTzs: number;
  tagline: string;
  highlighted: boolean;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    priceTzs: 180_000,
    tagline: "Point of Sale for shops & retailers",
    highlighted: false,
    features: [
      "Point of Sale register",
      "Record & manage inventory",
      "Invoices & EFD receipts",
      "Sales records by date & branch",
      "Profit / loss analytics",
      "Multi-branch metrics",
    ],
  },
  {
    id: "business",
    name: "Business",
    priceTzs: 540_000,
    tagline: "POS + full Finance & Accounting",
    highlighted: true,
    features: [
      "Everything in Starter",
      "General Ledger & Chart of Accounts",
      "Financial statements",
      "Sales, CRM & Procurement",
      "Banking & reconciliation",
      "Reports centre",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    priceTzs: 750_000,
    tagline: "Finance & Accounting + Payroll & Tax",
    highlighted: false,
    features: [
      "Everything in Business",
      "Payroll & statutory (PAYE, NSSF…)",
      "Tax returns (VAT, PAYE)",
      "Tax calendar & filing tracker",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    priceTzs: 1_500_000,
    tagline: "The complete financial platform",
    highlighted: false,
    features: [
      "Everything in Standard",
      "Fixed assets & audit",
      "Budgeting & financial modeling",
      "AI assistant & Digital Stamp",
    ],
  },
];

// Route-prefix → minimum tier required. The longest matching prefix wins.
// Anything not listed (and the always-allowed routes) resolves to `free` = open.
const ROUTE_MIN_TIER: { prefix: string; tier: Tier }[] = [
  // Starter
  { prefix: "/dashboard", tier: "starter" },
  { prefix: "/pos", tier: "starter" },
  // Business Finance & Accounting core + operations
  { prefix: "/general-ledger", tier: "business" },
  { prefix: "/financial-statements", tier: "business" },
  { prefix: "/management", tier: "business" },
  { prefix: "/sales", tier: "business" },
  { prefix: "/inventory", tier: "business" },
  { prefix: "/crm", tier: "business" },
  { prefix: "/procurement", tier: "business" },
  { prefix: "/banking", tier: "business" },
  { prefix: "/reports", tier: "business" },
  // Standard compliance (payroll + tax)
  { prefix: "/payroll", tier: "standard" },
  { prefix: "/tax", tier: "standard" },
  // Premium intelligence, assurance & modeling
  { prefix: "/fixed-assets", tier: "premium" },
  { prefix: "/audit", tier: "premium" },
  { prefix: "/budgeting", tier: "premium" },
  { prefix: "/modeling", tier: "premium" },
  { prefix: "/ai-assistant", tier: "premium" },
];

/** The minimum tier required to view a route. Always-allowed routes return `free`. */
export function minTierForPath(pathname: string): Tier {
  let best: { prefix: string; tier: Tier } | null = null;
  for (const entry of ROUTE_MIN_TIER) {
    if (pathname === entry.prefix || pathname.startsWith(entry.prefix + "/")) {
      if (!best || entry.prefix.length > best.prefix.length) best = entry;
    }
  }
  return best?.tier ?? "free";
}

/** Whether a tenant on `tier` may access `pathname`. */
export function canAccess(tier: Tier, pathname: string): boolean {
  return TIER_RANK[tier] >= TIER_RANK[minTierForPath(pathname)];
}

/** Whether a tenant on `tier` meets a minimum tier requirement. */
export function tierAtLeast(tier: Tier, min: Tier): boolean {
  return TIER_RANK[tier] >= TIER_RANK[min];
}

/** Narrow an arbitrary stored value (e.g. legacy "free"/"pro", or an untyped JWT claim) to a known Tier. */
export function normalizeTier(value: unknown): Tier {
  if (
    value === "starter" ||
    value === "business" ||
    value === "standard" ||
    value === "premium" ||
    value === "free"
  ) {
    return value;
  }
  // Legacy values: the old top tier "enterprise" (and "pro"/"paid") → premium so existing
  // accounts keep full access.
  if (value === "enterprise" || value === "pro" || value === "paid") return "premium";
  return "free";
}
