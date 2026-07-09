import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { authConfig } from "./auth.config";
import { authDb } from "@/lib/server/auth-db";
import { normalizeTier } from "@/lib/auth/tiers";
import type { UserRole } from "@/types";

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "tenant";
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/);
  const initials = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  return initials || "U";
}

/**
 * A first-time OAuth (Google) sign-in creates a User via the adapter but with no tenant. Provision
 * one now the same way registerCredentials does (own `free`-tier tenant, owner = Admin) so the
 * tenant-scoped domain layer works and the onboarding gate routes them to /onboarding.
 */
async function provisionTenantForUser(
  userId: string,
  name: string | null,
  email: string | null,
): Promise<string> {
  const localPart = email?.split("@")[0] || name || "tenant";
  const base = slugify(localPart);
  let slug = base;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const clash = await authDb.tenant.findUnique({ where: { slug } });
    if (!clash) break;
    slug = `${base}-${attempt + 2}`;
  }
  const tenant = await authDb.tenant.create({ data: { name: localPart, slug, tier: "free" } });
  await authDb.user.update({
    where: { id: userId },
    data: { tenantId: tenant.id, role: "Admin", ...(name ? { initials: initialsFrom(name) } : {}) },
  });
  return tenant.id;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(authDb),
  session: { strategy: "jwt" },
  providers: [
    // Reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET from the environment. Google verifies the email,
    // so OAuth users skip our email-verification step. allowDangerousEmailAccountLinking lets a
    // user who signed up with email+password also use "Continue with Google" on the same address
    // safe here because every credential account is itself email-verified before it can sign in.
    Google({ allowDangerousEmailAccountLinking: true }),
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

        // Block sign-in until the email is verified. The login page distinguishes this from a
        // bad password via getVerificationState() and offers to resend the link.
        if (!user.emailVerified) return null;

        // Deactivated staff sub-accounts can't sign in.
        if (user.disabledAt) return null;

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
          select: { tenant: { select: { tier: true, status: true } } },
        });
        token.tier = normalizeTier(row?.tenant?.tier);
        token.tenantStatus = row?.tenant?.status ?? "active";
        return token;
      }
      // On sign-in, fold tenantId + role + tier from the User/Tenant rows into the token.
      if (user?.id) {
        const row = await authDb.user.findUnique({
          where: { id: user.id },
          select: { tenantId: true, role: true, branchId: true, name: true, image: true, isSuperAdmin: true, tenant: { select: { tier: true, status: true } } },
        });
        let tenantId = row?.tenantId ?? null;
        let role = (row?.role as UserRole | undefined) ?? "Accountant";
        let tier: string | undefined = row?.tenant?.tier;
        let status = row?.tenant?.status ?? "active";
        // First-ever OAuth sign-in has no tenant yet provision one (owner = Admin, free tier).
        if (!tenantId) {
          tenantId = await provisionTenantForUser(
            user.id,
            row?.name ?? user.name ?? null,
            user.email ?? null,
          );
          role = "Admin";
          tier = "free";
          status = "active";
        }
        token.tenantId = tenantId;
        token.role = role;
        token.branchId = row?.branchId ?? null;
        token.picture = row?.image ?? (typeof user.image === "string" ? user.image : null);
        token.tier = normalizeTier(tier);
        token.tenantStatus = status;
        token.isSuperAdmin = row?.isSuperAdmin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.sub === "string") session.user.id = token.sub;
        session.user.tenantId = typeof token.tenantId === "string" ? token.tenantId : "";
        session.user.role = (token.role as UserRole | undefined) ?? "Accountant";
        session.user.branchId = typeof token.branchId === "string" ? token.branchId : null;
        session.user.image = typeof token.picture === "string" ? token.picture : null;
        session.user.tier = normalizeTier(token.tier);
        session.user.status = typeof token.tenantStatus === "string" ? token.tenantStatus : "active";
        session.user.isSuperAdmin = token.isSuperAdmin === true;
      }
      return session;
    },
  },
});
