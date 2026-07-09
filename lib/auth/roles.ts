// Role-based access — the companion to lib/auth/tiers.ts (which gates by subscription tier). Tier
// answers "did the tenant pay for this module?"; roles answer "may THIS user reach it?".
//
// EDGE-SAFE: pure types + constants + functions, no node-only imports, so auth.config.ts (edge
// proxy), client components and server actions can all import it.

import type { UserRole } from "@/types";

// Staff sub-account roles that are bound to a single branch and see only that branch's data.
export const BRANCH_RESTRICTED_ROLES: readonly UserRole[] = ["Branch Manager", "Cashier"];

// Roles the owner can invite as staff (Admin/owner is created at signup, not invited).
export const INVITABLE_ROLES: readonly UserRole[] = [
  "Branch Manager",
  "Cashier",
  "Finance Manager",
  "Accountant",
  "Data Entry",
  "HR Manager",
  "Auditor",
];

export function isBranchRestricted(role: UserRole | undefined): boolean {
  return role !== undefined && BRANCH_RESTRICTED_ROLES.includes(role);
}

/** True if the role is a full-access owner/admin (no module or branch restriction). */
export function isAdminRole(role: UserRole | undefined): boolean {
  return role === "Admin";
}

// Module route-prefixes a limited role may reach (in ADDITION to the tenant's tier gate). A role
// NOT listed here is unrestricted (Admin + all finance personas). Everyone may reach these baseline
// self-service routes. The longest-prefix rule matches lib/auth/tiers.ts.
const BASELINE_PREFIXES = ["/settings/preferences", "/pending-approval", "/select-plan", "/onboarding"];

const ROLE_MODULES: Partial<Record<UserRole, string[]>> = {
  Cashier: ["/pos"],
  "Branch Manager": ["/pos", "/inventory", "/dashboard", "/reports"],
};

/** Whether `role` may reach `pathname` (role dimension only — tier is checked separately). */
export function roleCanAccess(role: UserRole | undefined, pathname: string): boolean {
  const allowed = role ? ROLE_MODULES[role] : undefined;
  if (!allowed) return true; // unrestricted role (Admin / finance personas)
  const prefixes = [...allowed, ...BASELINE_PREFIXES];
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** Where a role lands after login / when bounced from a forbidden route. */
export function roleLanding(role: UserRole | undefined): string {
  if (role === "Cashier") return "/pos";
  return "/dashboard";
}

/** Only Admins manage staff and tenant settings like Users. */
export function canManageStaff(role: UserRole | undefined): boolean {
  return role === "Admin";
}

// ── Financial-action authorization (server-enforced on money-moving mutations) ──
// Post journals / invoices / expenses. Data Entry may draft but not post; Auditor is read-only.
export const POST_ROLES: readonly UserRole[] = ["Admin", "CFO", "Finance Manager", "Accountant"];
// Close the year, set opening balances, reconcile/revalue, reverse — senior finance only.
export const CLOSE_ROLES: readonly UserRole[] = ["Admin", "CFO", "Finance Manager"];
// Manage banking (create accounts, import statements, reconcile, revalue FX).
export const BANKING_ROLES: readonly UserRole[] = ["Admin", "CFO", "Finance Manager", "Accountant"];
// Run and approve payroll.
export const PAYROLL_ROLES: readonly UserRole[] = ["Admin", "CFO", "Finance Manager", "HR Manager"];

export function canPostFinancials(role: UserRole | undefined): boolean {
  return role !== undefined && POST_ROLES.includes(role);
}
export function canClosePeriod(role: UserRole | undefined): boolean {
  return role !== undefined && CLOSE_ROLES.includes(role);
}
export function canManageBanking(role: UserRole | undefined): boolean {
  return role !== undefined && BANKING_ROLES.includes(role);
}
export function canRunPayroll(role: UserRole | undefined): boolean {
  return role !== undefined && PAYROLL_ROLES.includes(role);
}
