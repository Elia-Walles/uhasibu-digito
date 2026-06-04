"use client";
import { useEffect } from "react";
import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut as nextAuthSignOut } from "next-auth/react";
import { AUTH_BACKEND_ENABLED } from "@/lib/flags";
import { useAuthStore } from "@/lib/store/authStore";
import type { UserRole } from "@/types";

export interface CurrentUser {
  name: string;
  role: UserRole;
  email: string;
  initials: string;
}

function initialsFor(source: string): string {
  const parts = source.trim().split(/\s+/);
  const initials = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  return initials || source.slice(0, 2).toUpperCase() || "U";
}

function subscribeHydration(callback: () => void) {
  return useAuthStore.persist.onFinishHydration(callback);
}

/**
 * Unified current-user read. Both underlying hooks are called every render (the flag
 * is a build-time constant, so hook order is stable); the flag selects which result
 * to map. Returns null while loading / signed out.
 */
export function useCurrentUser(): CurrentUser | null {
  const { data: session } = useSession();
  const mockUser = useAuthStore((s) => s.user);

  if (AUTH_BACKEND_ENABLED) {
    const u = session?.user;
    if (!u) return null;
    const name = u.name ?? u.email ?? "User";
    return {
      name,
      role: u.role,
      email: u.email ?? "",
      initials: initialsFor(name),
    };
  }

  if (!mockUser) return null;
  return {
    name: mockUser.name,
    role: mockUser.role,
    email: mockUser.email,
    initials: mockUser.initials,
  };
}

/** Returns a sign-out function that works in both modes and lands on /login. */
export function useSignOut(): () => Promise<void> {
  const router = useRouter();
  const mockLogout = useAuthStore((s) => s.logout);
  return async () => {
    if (AUTH_BACKEND_ENABLED) {
      await nextAuthSignOut({ redirect: false });
    } else {
      mockLogout();
    }
    router.push("/login");
  };
}

/**
 * Route guard used by the app shell. Redirects to /login when unauthenticated and
 * reports when it is safe to render the protected layout.
 */
export function useAuthGuard(): { ready: boolean } {
  const router = useRouter();
  const { status } = useSession();
  const mockAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const mockUser = useAuthStore((s) => s.user);
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => useAuthStore.persist.hasHydrated(),
    () => false,
  );

  useEffect(() => {
    if (AUTH_BACKEND_ENABLED) {
      if (status === "unauthenticated") router.replace("/login");
    } else if (hydrated && !mockAuthenticated) {
      router.replace("/login");
    }
  }, [status, hydrated, mockAuthenticated, router]);

  if (AUTH_BACKEND_ENABLED) {
    return { ready: status === "authenticated" };
  }
  return { ready: hydrated && Boolean(mockUser) };
}
