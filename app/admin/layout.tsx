"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isSuper = session?.user?.isSuperAdmin === true;

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (status === "authenticated" && !isSuper) router.replace("/dashboard");
  }, [status, isSuper, router]);

  if (status === "loading" || !isSuper) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-ud-surface-3">
        <div className="w-12 h-12 rounded-2xl gradient-teal animate-pulse-soft" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ud-surface-3">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 bg-ud-obsidian hidden md:block">
        <AdminSidebar />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-ud-obsidian/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 bg-ud-obsidian md:hidden"
            >
              <AdminSidebar onNavigate={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AdminTopBar onMenu={() => setMobileOpen(true)} />

      <main className="md:ml-[260px] pt-16">
        <div className="px-4 md:px-6 lg:px-8 py-6 max-w-[1440px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
