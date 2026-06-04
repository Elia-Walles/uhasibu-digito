import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Edge route guard (Next 16 `proxy` convention, formerly `middleware`).
// NextAuth(authConfig).auth applies the `authorized` callback,
// which is a no-op while the auth backend is flag-disabled (the legacy client guard
// runs instead). With the flag on, unauthenticated users are redirected to /login.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|manifest.json|api/auth).*)"],
};
