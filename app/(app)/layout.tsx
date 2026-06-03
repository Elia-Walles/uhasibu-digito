"use client";
import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { AppInitializer } from "@/components/AppInitializer";
import { useAuthStore } from "@/lib/store/authStore";
import { useAppStore } from "@/lib/store/appStore";
import { cn } from "@/lib/utils/cn";

function subscribeHydration(callback: () => void) {
  return useAuthStore.persist.onFinishHydration(callback);
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { sidebarCollapsed } = useAppStore();

  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => useAuthStore.persist.hasHydrated(),
    () => false
  );

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.replace("/login");
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || !user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-ud-surface-3">
        <div className="w-12 h-12 rounded-2xl gradient-teal animate-pulse-soft" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ud-surface-3">
      <AppInitializer />
      <Sidebar />
      <TopBar />
      <main
        className={cn(
          "transition-[margin] duration-200 pt-16 pb-20 md:pb-6",
          sidebarCollapsed ? "md:ml-[68px]" : "md:ml-[260px]"
        )}
      >
        <div className="px-4 md:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto">{children}</div>
        <Footer />
      </main>
      <MobileNav />
    </div>
  );
}
