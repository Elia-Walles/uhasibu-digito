import type { NextAuthConfig } from "next-auth";
import { TIER_RANK, minTierForPath, normalizeTier } from "@/lib/auth/tiers";

// Edge-safe Auth.js config shared with the proxy/middleware. NO Node-only imports
// here (no Prisma, no bcrypt) — it runs on the edge runtime and only decodes the JWT
// cookie to decide route access. lib/auth/tiers.ts is pure and edge-safe.
const PUBLIC_PREFIXES = ["/login", "/register", "/forgot-password", "/reset-password", "/legal"];

// Routes any authenticated user may reach regardless of subscription tier (so a
// plan-less `free` account can still pick a plan / manage settings).
const TIER_EXEMPT_PREFIXES = ["/select-plan", "/settings"];

export const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const { pathname } = nextUrl;
      if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
      if (!auth?.user) return false;

      if (TIER_EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
        return true;
      }

      // Tier gating: redirect to the pricing page if the plan is below the route's requirement.
      const tier = normalizeTier(auth.user.tier);
      const required = minTierForPath(pathname);
      if (TIER_RANK[tier] < TIER_RANK[required]) {
        const url = new URL("/select-plan", nextUrl.origin);
        url.searchParams.set("from", pathname);
        return Response.redirect(url);
      }
      return true;
    },
    // Edge session: surface the tier from the JWT so `authorized` can read it.
    session({ session, token }) {
      if (session.user) session.user.tier = normalizeTier(token.tier);
      return session;
    },
  },
} satisfies NextAuthConfig;
