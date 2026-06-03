"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Users, Activity, Settings as SettingsIcon, Network, Scale } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { href: "/settings/company",      label: "Company",      icon: Building2 },
  { href: "/settings/organisation", label: "Organisation", icon: Network },
  { href: "/settings/users",        label: "Users",        icon: Users },
  { href: "/settings/audit-trail",  label: "Audit trail",  icon: Activity },
  { href: "/settings/preferences",  label: "Preferences",  icon: SettingsIcon },
  { href: "/legal/terms-of-service", label: "Legal",       icon: Scale },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <PageWrapper>
      <PageHeader title="Settings" subtitle="Manage company, users, audit trail, and preferences" />
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <aside className="space-y-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors",
                  isActive ? "bg-ud-primary-50 text-ud-primary font-medium" : "text-ud-text-secondary hover:bg-ud-surface-2"
                )}
              >
                <Icon className="w-4 h-4" />{t.label}
              </Link>
            );
          })}
        </aside>
        <div>{children}</div>
      </div>
    </PageWrapper>
  );
}
