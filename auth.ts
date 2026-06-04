import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import { compare } from "bcryptjs";
import { authConfig } from "./auth.config";
import { authDb } from "@/lib/server/auth-db";
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
    Resend({
      from: process.env.EMAIL_FROM ?? "",
      apiKey: process.env.RESEND_API_KEY ?? "",
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      // On sign-in, fold tenantId + role from the User row into the token.
      if (user?.id) {
        const row = await authDb.user.findUnique({
          where: { id: user.id },
          select: { tenantId: true, role: true },
        });
        token.tenantId = row?.tenantId ?? null;
        token.role = (row?.role as UserRole | undefined) ?? "Accountant";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.sub === "string") session.user.id = token.sub;
        session.user.tenantId = typeof token.tenantId === "string" ? token.tenantId : "";
        session.user.role = (token.role as UserRole | undefined) ?? "Accountant";
      }
      return session;
    },
  },
});
