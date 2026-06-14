// Plain, serializable view models returned by admin Server Actions (number money,
// ISO-string dates) so the admin client components consume them directly, mirroring
// the serialization convention used by the tenant-scoped actions.
import type { Tier } from "@/lib/auth/tiers";
import type { UserRole } from "@/types";

export interface AdminTenantRow {
  id: string;
  name: string;
  slug: string;
  tier: Tier;
  userCount: number;
  subscriptionStatus: string | null;
  mrrTzs: number; // monthly-normalized recurring revenue from the active subscription
  createdAt: string;
}

export interface AdminTenantDetail extends AdminTenantRow {
  companyName: string | null;
  tin: string | null;
  email: string | null;
  phone: string | null;
  region: string | null;
  totalPaidTzs: number;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isSuperAdmin: boolean;
  tenantId: string | null;
  tenantName: string | null;
  createdAt: string;
}

export interface AdminPlanRow {
  id: string;
  key: string;
  name: string;
  tagline: string;
  priceTzs: number;
  interval: string;
  features: string[];
  isActive: boolean;
  highlighted: boolean;
  sortOrder: number;
  subscriberCount: number;
}

export interface AdminSubscriptionRow {
  id: string;
  tenantId: string;
  tenantName: string | null;
  planName: string;
  planKey: string;
  status: string;
  amountTzs: number;
  startedAt: string;
  currentPeriodEnd: string | null;
}

export interface AdminPaymentRow {
  id: string;
  tenantId: string;
  tenantName: string | null;
  amountTzs: number;
  method: string;
  reference: string;
  status: string;
  paidAt: string;
  note: string;
}

export interface AdminAuditRow {
  id: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  targetTenantId: string | null;
  details: string;
  createdAt: string;
}

export interface PlatformOverview {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  superAdmins: number;
  mrrTzs: number;
  arrTzs: number;
  paymentsThisMonthTzs: number;
  signupsThisMonth: number;
  tenantsByTier: { tier: Tier; count: number }[];
}

/** A generic read-only drill-down table payload for a tenant's business module. */
export interface DrilldownTable {
  columns: { key: string; label: string; align?: "left" | "right" }[];
  rows: Record<string, string | number>[];
}
