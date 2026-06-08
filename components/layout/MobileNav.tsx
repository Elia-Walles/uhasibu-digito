"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Boxes, Sparkles, Menu, Receipt, LineChart } from "lucide-react";
import { useAppStore } from "@/lib/store/appStore";
import { useTier } from "@/lib/hooks/useTier";
import { TIER_RANK, type Tier } from "@/lib/auth/tiers";
import { cn } from "@/lib/utils/cn";

const TAB_CANDIDATES: { label: string; href: string; icon: typeof LayoutDashboard; minTier: Tier }[] = [
  { label: "Dashboard", href: "/dashboard",     icon: LayoutDashboard, minTier: "starter" },
  { label: "Sales",     href: "/pos",           icon: ShoppingCart,    minTier: "starter" },
  { label: "Inventory", href: "/pos/inventory", icon: Boxes,           minTier: "starter" },
  { label: "Analytics", href: "/pos/analytics", icon: LineChart,       minTier: "starter" },
  { label: "Invoices",  href: "/sales",         icon: Receipt,         minTier: "business" },
  { label: "AI",        href: "/ai-assistant",  icon: Sparkles,        minTier: "enterprise" },
];

export function MobileNav() {
  const pathname = usePathname();
  const { toggleSidebar } = useAppStore();
  const { tier } = useTier();

  const tabs = TAB_CANDIDATES.filter((t) => TIER_RANK[tier] >= TIER_RANK[t.minTier]).slice(0, 4);
  const activeHref = tabs
    .map((t) => t.href)
    .filter((href) => pathname === href || pathname.startsWith(href + "/"))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white/95 backdrop-blur-md border-t border-ud-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5 h-16">
        {tabs.map((t) => {
          const isActive = t.href === activeHref;
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
