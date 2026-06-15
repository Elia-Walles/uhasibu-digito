"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Home } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useT } from "@/lib/hooks/useT";
import { cn } from "@/lib/utils/cn";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
  icon?: LucideIcon;
}

export function PageHeader({ title, subtitle, breadcrumbs, actions, className, icon: Icon }: PageHeaderProps) {
  const t = useT();
  return (
    <div className={cn("mb-6", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-ud-text-muted mb-2" aria-label="Breadcrumb">
          <Link href="/dashboard" className="hover:text-ud-primary inline-flex items-center" aria-label="Dashboard">
            <Home className="w-3 h-3" />
          </Link>
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <ChevronRight className="w-3 h-3" />
              {b.href ? (
                <Link href={b.href} className="hover:text-ud-primary">
                  {t(b.label)}
                </Link>
              ) : (
                <span className="text-ud-text-secondary">{t(b.label)}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
      >
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="hidden sm:flex w-11 h-11 rounded-2xl bg-ud-primary-50 items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-ud-primary" />
            </div>
          )}
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold text-ud-text-primary text-balance">
              {t(title)}
            </h1>
            {subtitle && <p className="mt-1 text-sm text-ud-text-muted text-balance">{t(subtitle)}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </motion.div>
    </div>
  );
}
