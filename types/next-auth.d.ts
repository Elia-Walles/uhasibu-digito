import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/types";
import type { Tier } from "@/lib/auth/tiers";

// Augment the Auth.js session so `session.user` carries the tenant + role + subscription
// tier that the session callback reads off the User/Tenant rows (JWT session strategy).
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tenantId: string;
      role: UserRole;
      branchId: string | null; // set for branch-restricted staff (Branch Manager / Cashier)
      tier: Tier;
      status: string; // "active" | "pending_approval"
      isSuperAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    tenantId?: string | null;
    role?: UserRole;
  }
}

// JWT strategy: tenantId + role + tier are loaded into the token on sign-in (jwt callback)
// and copied onto session.user (session callback).
declare module "next-auth/jwt" {
  interface JWT {
    tenantId?: string | null;
    role?: UserRole;
    branchId?: string | null;
    tier?: Tier;
    tenantStatus?: string;
    isSuperAdmin?: boolean;
  }
}
