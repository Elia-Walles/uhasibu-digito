"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut as nextAuthSignOut } from "next-auth/react";
import type { UserRole } from "@/types";

export interface CurrentUser {
  name: string;
  role: UserRole;
  email: string;
  initials: string;
  tenantId: string;
  isSuperAdmin: boolean;
}

function initialsFor(source: string): string {
  const parts = source.trim().split(/\s+/);
  const initials = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  return initials || source.slice(0, 2).toUpperCase() || "U";
}

/** The signed-in user, or null while loading / signed out. */
export function useCurrentUser(): CurrentUser | null {
  const { data: session } = useSession();
  const u = session?.user;
  if (!u) return null;
  const name = u.name ?? u.email ?? "User";
  return {
    name,
    role: u.role,
    email: u.email ?? "",
    initials: initialsFor(name),
    tenantId: u.tenantId ?? "",
    isSuperAdmin: u.isSuperAdmin === true,
  };
}

/** Sign out and land on /login. */
export function useSignOut(): () => Promise<void> {
  const router = useRouter();
  return async () => {
    await nextAuthSignOut({ redirect: false });
    router.push("/login");
  };
}

/** Route guard for the app shell: redirects to /login when unauthenticated. */
export function useAuthGuard(): { ready: boolean } {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  return { ready: status === "authenticated" };
}
