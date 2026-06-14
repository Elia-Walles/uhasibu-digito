"use client";
import { SessionProvider } from "next-auth/react";

// Always mounted at the root. With the auth backend flag off there is no Auth.js
// session and this is harmless the mock path is used instead.
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
