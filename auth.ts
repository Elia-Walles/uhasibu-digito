import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { authConfig } from "./auth.config";
import { authDb } from "@/lib/server/auth-db";
import { normalizeTier } from "@/lib/auth/tiers";
import type { UserRole } from "@/types";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(authDb),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const user = await authDb.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      // Live profile-photo updates from settings → preferences (session.update({ image })).
      if (trigger === "update" && session && typeof (session as { image?: unknown }).image === "string") {
        token.picture = (session as { image: string }).image;
        return token;
      }
      // Plan changes: re-read the tenant tier from the DB so the new plan takes effect
      // without a re-login (the select-plan page calls session.update() after activating).
      if (trigger === "update" && typeof token.sub === "string") {
        const row = await authDb.user.findUnique({
          where: { id: token.sub },
          select: { tenant: { select: { tier: true } } },
        });
        token.tier = normalizeTier(row?.tenant?.tier);
        return token;
      }
      // On sign-in, fold tenantId + role + tier from the User/Tenant rows into the token.
      if (user?.id) {
        const row = await authDb.user.findUnique({
          where: { id: user.id },
          select: { tenantId: true, role: true, image: true, isSuperAdmin: true, tenant: { select: { tier: true } } },
        });
        token.tenantId = row?.tenantId ?? null;
        token.role = (row?.role as UserRole | undefined) ?? "Accountant";
        token.picture = row?.image ?? null;
        token.tier = normalizeTier(row?.tenant?.tier);
        token.isSuperAdmin = row?.isSuperAdmin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.sub === "string") session.user.id = token.sub;
        session.user.tenantId = typeof token.tenantId === "string" ? token.tenantId : "";
        session.user.role = (token.role as UserRole | undefined) ?? "Accountant";
        session.user.image = typeof token.picture === "string" ? token.picture : null;
        session.user.tier = normalizeTier(token.tier);
        session.user.isSuperAdmin = token.isSuperAdmin === true;
      }
      return session;
    },
  },
});
