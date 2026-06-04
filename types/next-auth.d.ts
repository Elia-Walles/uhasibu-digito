import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/types";

// Augment the Auth.js session so `session.user` carries the tenant + role that
// the session callback reads off the User row (database session strategy).
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tenantId: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    tenantId?: string | null;
    role?: UserRole;
  }
}

// JWT strategy: tenantId + role are loaded into the token on sign-in (jwt callback)
// and copied onto session.user (session callback).
declare module "next-auth/jwt" {
  interface JWT {
    tenantId?: string | null;
    role?: UserRole;
  }
}
