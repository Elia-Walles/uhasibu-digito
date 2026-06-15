"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Users, Activity, Settings as SettingsIcon, Network, Scale, Store, CreditCard } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { useT } from "@/lib/hooks/useT";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { href: "/settings/company",      label: "Company",      icon: Building2 },
  { href: "/settings/branches",     label: "Branches",     icon: Store },
  { href: "/settings/subscription", label: "Subscription", icon: CreditCard },
  { href: "/settings/organisation", label: "Organisation", icon: Network },
  { href: "/settings/users",        label: "Users",        icon: Users },
  { href: "/settings/audit-trail",  label: "Audit trail",  icon: Activity },
  { href: "/settings/preferences",  label: "Preferences",  icon: SettingsIcon },
  { href: "/legal/terms-of-service", label: "Legal",       icon: Scale },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useT();
  return (
    <PageWrapper>
      <PageHeader title={t("Settings")} subtitle={t("Manage company, users, audit trail, and preferences")} />
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <aside className="space-y-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors",
                  isActive ? "bg-ud-primary-50 text-ud-primary font-medium" : "text-ud-text-secondary hover:bg-ud-surface-2"
                )}
              >
                <Icon className="w-4 h-4" />{t(tab.label)}
              </Link>
            );
          })}
        </aside>
        <div>{children}</div>
      </div>
    </PageWrapper>
  );
}
