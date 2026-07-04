"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, BookOpen, FileBarChart, BarChart3, TrendingUp,
  ShoppingCart, Boxes, Users, Truck,
  Wallet, FileSpreadsheet, ShieldCheck, Target, Landmark,
  Sparkles, FolderOpen, Settings, X, ChevronLeft, ClipboardCheck,
  Receipt, LineChart, FileText, ShieldHalf, Calculator,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAppStore } from "@/lib/store/appStore";
import { useIsMobile } from "@/lib/hooks/useMediaQuery";
import { useCompany } from "@/lib/hooks/useCompany";
import { useCurrentUser } from "@/lib/auth/client";
import { useTier } from "@/lib/hooks/useTier";
import { useT } from "@/lib/hooks/useT";
import { TIER_RANK, type Tier } from "@/lib/auth/tiers";
import { cn } from "@/lib/utils/cn";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Minimum subscription tier required to see this item. Defaults to "starter". */
  minTier?: Tier;
  badge?: { value: string; color: "danger" | "warning" | "teal" };
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    label: "OVERVIEW",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, minTier: "starter" }],
  },
  {
    label: "POINT OF SALE",
    items: [
      { label: "Register",  href: "/pos/register",  icon: Calculator,   minTier: "starter" },
      { label: "Sales",     href: "/pos",           icon: ShoppingCart, minTier: "starter" },
      { label: "Inventory", href: "/pos/inventory", icon: Boxes,        minTier: "starter" },
      { label: "Invoice",   href: "/pos/invoice",   icon: FileText,     minTier: "starter" },
      { label: "Receipts",  href: "/pos/receipts",  icon: Receipt,      minTier: "starter" },
      { label: "Analytics", href: "/pos/analytics", icon: LineChart,    minTier: "starter" },
    ],
  },
  {
    label: "FINANCE",
    items: [
      { label: "General Ledger",       href: "/general-ledger",       icon: BookOpen,     minTier: "business" },
      { label: "Financial Statements", href: "/financial-statements", icon: FileBarChart, minTier: "business" },
      { label: "Management Accounts",  href: "/management",           icon: BarChart3,    minTier: "business" },
      { label: "Financial Modeling",   href: "/modeling",             icon: TrendingUp,   minTier: "premium" },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { label: "Sales",        href: "/sales",        icon: ShoppingCart, minTier: "business", badge: { value: "7", color: "danger" } },
      { label: "Inventory",    href: "/inventory",    icon: Boxes,        minTier: "business" },
      { label: "CRM",          href: "/crm",          icon: Users,        minTier: "business" },
      { label: "Procurement",  href: "/procurement",  icon: Truck,        minTier: "business" },
    ],
  },
  {
    label: "COMPLIANCE",
    items: [
      { label: "Payroll",       href: "/payroll",       icon: Wallet,          minTier: "standard" },
      { label: "Tax",           href: "/tax",           icon: FileSpreadsheet, minTier: "standard", badge: { value: "3", color: "warning" } },
      { label: "Fixed Assets",  href: "/fixed-assets",  icon: ShieldCheck,     minTier: "premium" },
      { label: "Audit",         href: "/audit",         icon: ClipboardCheck,  minTier: "premium" },
      { label: "Budgeting",     href: "/budgeting",     icon: Target,          minTier: "premium" },
      { label: "Banking",       href: "/banking",       icon: Landmark,        minTier: "business" },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { label: "AI Assistant",    href: "/ai-assistant", icon: Sparkles,   minTier: "premium", badge: { value: "9", color: "teal" } },
      { label: "Reports Centre",  href: "/reports",      icon: FolderOpen, minTier: "business" },
    ],
  },
  {
    label: "SYSTEM",
    items: [{ label: "Settings", href: "/settings", icon: Settings, minTier: "starter" }],
  },
];

const BADGE_COLOR = {
  danger:  "bg-ud-danger/90 text-white",
  warning: "bg-ud-warning/90 text-white",
  teal:    "bg-ud-primary-glow text-ud-obsidian",
};

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, sidebarCollapsed, setSidebarOpen, toggleCollapse } = useAppStore();
  const isMobile = useIsMobile();
  const { company } = useCompany();
  const { tier } = useTier();
  const user = useCurrentUser();
  const t = useT();

  const width = isMobile ? "w-[260px]" : sidebarCollapsed ? "w-[68px]" : "w-[260px]";

  // Only show sections/items the current plan unlocks; drop sections left empty.
  const sections = NAV
    .map((section) => ({
      ...section,
      items: section.items.filter((i) => TIER_RANK[tier] >= TIER_RANK[i.minTier ?? "starter"]),
    }))
    .filter((section) => section.items.length > 0);

  // Super-admins get a dedicated link to the platform control room (bypasses tier gating).
  if (user?.isSuperAdmin) {
    sections.push({
      label: "PLATFORM",
      items: [{ label: "Platform Admin", href: "/admin", icon: ShieldHalf, minTier: "starter" }],
    });
  }

  // The single active item is the one whose href is the longest prefix of the path 
  // so /pos/sales activates "Sales Records", not the "/pos" Register parent.
  const activeHref = sections
    .flatMap((s) => s.items.map((i) => i.href))
    .filter((href) => pathname === href || pathname.startsWith(href + "/"))
    .sort((a, b) => b.length - a.length)[0];

  const sidebarContent = (
    <nav className={cn("h-full flex flex-col text-white dark-scrollbar", width, "transition-[width] duration-200")}>
      {/* Brand */}
      <div className={cn("flex items-center gap-3 px-5 h-16 border-b border-white/5 flex-shrink-0", sidebarCollapsed && !isMobile && "px-3 justify-center")}>
        <Image
          src="/images/uhasibu-digito-circle.png"
          alt="Uhasibu Digito"
          width={36}
          height={36}
          priority
          className="w-9 h-9 rounded-xl flex-shrink-0 shadow-gold-glow"
        />
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <div className="font-display font-bold text-sm leading-tight">Uhasibu Digito</div>
            <div className="text-[10px] text-white/50 tracking-[0.1em] uppercase truncate">{company?.shortName || company?.name || ""}</div>
          </div>
        )}
        {isMobile && (
          <button
            className="ml-auto p-1.5 rounded-lg hover:bg-white/5 text-white/60"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-3 dark-scrollbar">
        {sections.map((section) => (
          <div key={section.label} className="mb-4 last:mb-0">
            {!sidebarCollapsed && (
              <div className="px-5 mb-1.5 text-[10px] tracking-[0.14em] text-white/35 font-semibold">{t(section.label)}</div>
            )}
            <div className="space-y-0.5 px-2">
              {section.items.map((item) => {
                const isActive = item.href === activeHref;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => isMobile && setSidebarOpen(false)}
                    className={cn(
                      "relative flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-xl text-sm font-medium transition-colors group",
                      isActive
                        ? "text-white"
                        : "text-white/65 hover:text-white hover:bg-white/5"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active-pill"
                        className="absolute inset-0 rounded-xl bg-ud-primary/85 -z-0 shadow-[0_0_20px_-4px_rgba(20,168,126,0.5)]"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon className={cn("w-4 h-4 flex-shrink-0 relative z-10", isActive && "text-white")} />
                    {!sidebarCollapsed && (
                      <>
                        <span className="relative z-10 truncate flex-1">{t(item.label)}</span>
                        {item.badge && (
                          <span
                            className={cn(
                              "relative z-10 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                              BADGE_COLOR[item.badge.color]
                            )}
                          >
                            {item.badge.value}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / collapse */}
      {!isMobile && (
        <div className="px-2 py-3 border-t border-white/5 flex-shrink-0">
          <button
            onClick={toggleCollapse}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-white/55 hover:bg-white/5 hover:text-white transition-colors"
          >
            <ChevronLeft className={cn("w-3.5 h-3.5 transition-transform", sidebarCollapsed && "rotate-180")} />
            {!sidebarCollapsed && <span>{t("Collapse")}</span>}
          </button>
        </div>
      )}
    </nav>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-ud-obsidian/60 backdrop-blur-sm md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 bg-ud-obsidian md:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return <aside className="fixed inset-y-0 left-0 z-30 bg-ud-obsidian hidden md:block">{sidebarContent}</aside>;
}
