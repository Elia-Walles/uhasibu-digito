"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Building2, Users, CreditCard, Receipt, ReceiptText, Layers, ScrollText, Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useT } from "@/lib/hooks/useT";
import { cn } from "@/lib/utils/cn";

interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const ADMIN_NAV: AdminNavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Tenants", href: "/admin/tenants", icon: Building2 },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
  { label: "Payments", href: "/admin/payments", icon: Receipt },
  { label: "Subscription invoices", href: "/admin/subscription-invoices", icon: ReceiptText },
  { label: "Plans", href: "/admin/plans", icon: Layers },
  { label: "Audit log", href: "/admin/audit", icon: ScrollText },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useT();
  const activeHref = ADMIN_NAV.map((i) => i.href)
    .filter((href) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/")))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav className="h-full flex flex-col text-white w-[260px]">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/5 flex-shrink-0">
        <Image
          src="/images/uhasibu-digito-circle.png"
          alt="Uhasibu Digito"
          width={36}
          height={36}
          priority
          className="w-9 h-9 rounded-xl flex-shrink-0 shadow-gold-glow"
        />
        <div className="min-w-0">
          <div className="font-display font-bold text-sm leading-tight">Uhasibu Digito</div>
          <div className="text-[10px] text-ud-gold tracking-[0.14em] uppercase truncate">{t("Platform Admin")}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3 dark-scrollbar">
        <div className="space-y-0.5 px-2">
          {ADMIN_NAV.map((item) => {
            const isActive = item.href === activeHref;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                {...(onNavigate ? { onClick: onNavigate } : {})}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group",
                  isActive ? "text-white" : "text-white/65 hover:text-white hover:bg-white/5",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <motion.span
                    layoutId="admin-active-pill"
                    className="absolute inset-0 rounded-xl bg-ud-primary/85 -z-0 shadow-[0_0_20px_-4px_rgba(20,168,126,0.5)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className={cn("w-4 h-4 flex-shrink-0 relative z-10", isActive && "text-white")} />
                <span className="relative z-10 truncate flex-1">{t(item.label)}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-white/5 flex-shrink-0">
        <Link href="/dashboard" className="text-xs text-white/45 hover:text-white transition-colors">
          ← {t("Back to app")}
        </Link>
      </div>
    </nav>
  );
}
