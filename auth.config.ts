import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/types";
import { TIER_RANK, minTierForPath, normalizeTier } from "@/lib/auth/tiers";
import { roleCanAccess, roleLanding } from "@/lib/auth/roles";

// Edge-safe Auth.js config shared with the proxy/middleware. NO Node-only imports
// here (no Prisma, no bcrypt) it runs on the edge runtime and only decodes the JWT
// cookie to decide route access. lib/auth/tiers.ts is pure and edge-safe.
const PUBLIC_PREFIXES = ["/login", "/register", "/verify-email", "/forgot-password", "/reset-password", "/legal", "/pricing"];

// Routes any authenticated user may reach regardless of subscription tier (so a
// plan-less `free` account can still complete onboarding / pick a plan / manage settings).
const TIER_EXEMPT_PREFIXES = ["/onboarding", "/select-plan", "/settings"];

export const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const { pathname } = nextUrl;
      // The public landing page exact match only (a "/" prefix would open every route).
      if (pathname === "/") return true;
      if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
      if (!auth?.user) return false;

      const isSuper = auth.user.isSuperAdmin === true;

      // The /admin area is the platform super-admin's control room gate it strictly.
      if (pathname === "/admin" || pathname.startsWith("/admin/")) {
        return isSuper ? true : Response.redirect(new URL("/dashboard", nextUrl.origin));
      }

      // Super-admins bypass all tier-gating on the rest of the app they may have no
      // tenant/tier at all, and must never be bounced to /select-plan.
      if (isSuper) return true;

      // A tenant awaiting payment approval is locked to the pending-approval screen (it can still
      // view/download its invoice) until an admin activates it.
      if (auth.user.status === "pending_approval") {
        return pathname.startsWith("/pending-approval")
          ? true
          : Response.redirect(new URL("/pending-approval", nextUrl.origin));
      }

      // Role gating: branch-restricted staff (Cashier / Branch Manager) may only reach their own
      // modules (POS, their branch's inventory, etc.); anything else bounces to their landing page.
      // Unrestricted roles (Admin + finance personas) pass straight through. Checked before the
      // tier-exempt allowance so a Cashier can't wander into /settings/users, etc.
      if (!roleCanAccess(auth.user.role, pathname)) {
        return Response.redirect(new URL(roleLanding(auth.user.role), nextUrl.origin));
      }

      if (TIER_EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
        return true;
      }

      // Tier gating: a not-yet-onboarded (`free`) or under-tier account is sent to the onboarding
      // wizard to complete business info + pick a plan. (Plan changes later use /select-plan.)
      const tier = normalizeTier(auth.user.tier);
      const required = minTierForPath(pathname);
      if (TIER_RANK[tier] < TIER_RANK[required]) {
        const url = new URL("/onboarding", nextUrl.origin);
        url.searchParams.set("from", pathname);
        return Response.redirect(url);
      }
      return true;
    },
    // Edge session: surface the role/branch/tier/super-admin flags from the JWT so `authorized` can read them.
    session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as UserRole | undefined) ?? "Accountant";
        session.user.branchId = typeof token.branchId === "string" ? token.branchId : null;
        session.user.tier = normalizeTier(token.tier);
        session.user.status = typeof token.tenantStatus === "string" ? token.tenantStatus : "active";
        session.user.isSuperAdmin = token.isSuperAdmin === true;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
