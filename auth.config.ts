import type { NextAuthConfig } from "next-auth";

// Edge-safe Auth.js config shared with the proxy/middleware. NO Node-only imports
// here (no Prisma, no bcrypt) — it runs on the edge runtime and only decodes the JWT
// cookie to decide route access.
const PUBLIC_PREFIXES = ["/login", "/register", "/forgot-password", "/reset-password", "/legal"];

export const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isPublic = PUBLIC_PREFIXES.some((p) => nextUrl.pathname.startsWith(p));
      if (isPublic) return true;
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
