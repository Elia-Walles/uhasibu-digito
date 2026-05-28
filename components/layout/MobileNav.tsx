"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Boxes, Sparkles, Menu } from "lucide-react";
import { useAppStore } from "@/lib/store/appStore";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Sales",     href: "/sales",     icon: ShoppingCart },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "AI",        href: "/ai-assistant", icon: Sparkles },
];

export function MobileNav() {
  const pathname = usePathname();
  const { toggleSidebar } = useAppStore();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white/95 backdrop-blur-md border-t border-ud-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5 h-16">
        {TABS.map((t) => {
          const isActive = pathname === t.href || pathname.startsWith(t.href + "/");
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5",
                isActive ? "text-ud-primary" : "text-ud-text-muted"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{t.label}</span>
            </Link>
          );
        })}
        <button
          onClick={toggleSidebar}
          className="flex flex-col items-center justify-center gap-0.5 text-ud-text-muted"
          aria-label="More menu"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </nav>
  );
}
