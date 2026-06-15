"use client";
import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { useAppStore } from "@/lib/store/appStore";

// Keeps <html lang> in sync with the chosen locale (persisted in the Zustand store).
// Root <html> stays lang="en" at SSR with suppressHydrationWarning, then this corrects it.
function LocaleHtmlSync() {
  const locale = useAppStore((s) => s.locale);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LocaleHtmlSync />
      {children}
    </SessionProvider>
  );
}
