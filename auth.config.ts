import type { NextAuthConfig } from "next-auth";
import { AUTH_BACKEND_ENABLED } from "@/lib/flags";

// Edge-safe Auth.js config shared with middleware. NO Node-only imports here
// (no Prisma, no bcrypt) — middleware runs on the edge runtime and only needs to
// decode the JWT cookie and decide route access.
const PUBLIC_PREFIXES = ["/login", "/register", "/legal"];

export const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    // Used by middleware to gate routes. While the auth backend is flag-disabled,
    // allow everything through — the legacy client-side Zustand guard still runs and
    // the demo is untouched. When enabled, redirect unauthenticated users to /login.
    authorized({ auth, request: { nextUrl } }) {
      if (!AUTH_BACKEND_ENABLED) return true;
      const isPublic = PUBLIC_PREFIXES.some((p) => nextUrl.pathname.startsWith(p));
      if (isPublic) return true;
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
