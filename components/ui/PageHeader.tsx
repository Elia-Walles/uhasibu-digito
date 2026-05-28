import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
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
}

export function PageHeader({ title, subtitle, breadcrumbs, actions, className }: PageHeaderProps) {
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
                  {b.label}
                </Link>
              ) : (
                <span className="text-ud-text-secondary">{b.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-ud-text-primary text-balance">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-ud-text-muted text-balance">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
