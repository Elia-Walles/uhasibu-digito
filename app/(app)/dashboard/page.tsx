"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  TrendingUp, Wallet, ArrowDownToLine, AlertCircle,
  ShoppingCart, FilePlus2, Users, Boxes, Sparkles, Receipt,
} from "lucide-react";
import { useSession } from "next-auth/react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { EmptyState } from "@/components/ui/EmptyState";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { useInvoices } from "@/lib/hooks/useInvoices";
import { getDashboard, type DashboardData } from "@/lib/server/actions/analytics";
import { formatDate, daysUntil } from "@/lib/utils/dates";

const QUICK_ACTIONS = [
  { label: "New Invoice",   href: "/sales/new-invoice",         icon: FilePlus2,    color: "gradient-teal" },
  { label: "Run Payroll",   href: "/payroll/run-payroll",       icon: Wallet,       color: "gradient-emerald" },
  { label: "Add Customer",  href: "/crm/customers",             icon: Users,        color: "gradient-gold" },
  { label: "Stock Check",   href: "/inventory/items",           icon: Boxes,        color: "gradient-blue" },
];

export default function DashboardPage() {
  const { invoices, loading: invLoading } = useInvoices();
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getDashboard().then((d) => {
      if (!active) return;
      setData(d);
      setDashLoading(false);
    });
    return () => { active = false; };
  }, []);

  if (invLoading || dashLoading || !data) return <PageWrapper><DashboardSkeleton /></PageWrapper>;

  const firstName = (session?.user?.name ?? "").split(" ")[0] || "there";
  const recentInvoices = invoices.slice(0, 6);

  const kpis = [
    { label: "Revenue MTD",     value: data.revenueMtd,   icon: <TrendingUp />,      variant: "teal" as const },
    { label: "Sales to date",   value: data.salesToDate,  icon: <TrendingUp />,      variant: "emerald" as const },
    { label: "Net profit (FY)", value: data.netProfitFy,  icon: <Wallet />,          variant: "emerald" as const },
    { label: "Cash position",   value: data.cashPosition, icon: <ArrowDownToLine />, variant: "blue" as const },
    { label: "Receivables",     value: data.receivables,  icon: <AlertCircle />,     variant: "amber" as const },
  ];

  return (
    <PageWrapper>
      <PageHeader title={`Welcome back, ${firstName}`} subtitle="Here's how your business is doing today." />

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
        className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6"
      >
        {kpis.map((kpi) => (
          <motion.div key={kpi.label} variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>
            <StatCard label={kpi.label} value={kpi.value} prefix="TSh" icon={kpi.icon} variant={kpi.variant} format="compact" />
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Section className="lg:col-span-2" title="Recent transactions" subtitle="Latest invoices" headerRight={
          <Link href="/sales/invoices" className="text-xs font-medium text-ud-primary hover:underline">View all</Link>
        }>
          {recentInvoices.length === 0 ? (
            <EmptyState icon={Receipt} title="No invoices yet" description="Create your first invoice and it'll show up here." />
          ) : (
            <div className="divide-y divide-ud-border -mx-5">
              {recentInvoices.map((inv) => (
                <Link key={inv.id} href="/sales/invoices" className="flex items-center gap-3 px-5 py-3 hover:bg-ud-surface-2 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-ud-primary-50 flex items-center justify-center flex-shrink-0">
                    <ShoppingCart className="w-4 h-4 text-ud-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ud-text-primary truncate">{inv.customerName}</div>
                    <div className="text-xs text-ud-text-muted">{inv.number} · {formatDate(inv.issueDate)}</div>
                  </div>
                  <div className="text-right">
                    <CurrencyDisplay amount={inv.total} compact className="text-sm font-mono font-medium" />
                    <div className="mt-0.5">
                      <Badge size="sm" variant={
                        inv.status === "Paid" ? "success" : inv.status === "Overdue" ? "danger" :
                        inv.status === "Sent" ? "info" : inv.status === "Cancelled" ? "default" : "warning"
                      }>{inv.status}</Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Section>

        <Section title="Quick actions" subtitle="Most-used flows">
          <div className="grid grid-cols-2 gap-2.5">
            {QUICK_ACTIONS.map((a) => {
              const Icon = a.icon;
              return (
                <Link key={a.label} href={a.href} className="group p-3 rounded-xl border border-ud-border bg-white hover:border-ud-primary hover:shadow-card-hover transition-all">
                  <div className={`w-9 h-9 rounded-xl ${a.color} flex items-center justify-center mb-2`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-sm font-medium text-ud-text-primary group-hover:text-ud-primary transition-colors">{a.label}</div>
                </Link>
              );
            })}
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Section className="lg:col-span-3" title="Tax deadlines" subtitle="Upcoming TRA filings">
          {data.upcomingTax.length === 0 ? (
            <p className="text-sm text-ud-text-muted">No upcoming filings. You're all caught up.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {data.upcomingTax.map((t) => (
                <div key={t.id} className="p-3 rounded-xl border border-ud-border bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ud-text-primary">{t.type} — {t.period}</div>
                      <div className="text-xs text-ud-text-muted mt-0.5">Due {formatDate(t.dueDate)}</div>
                    </div>
                    <Badge variant={t.status === "Overdue" ? "danger" : t.status === "Pending" ? "warning" : "info"} pulse={t.status === "Overdue"}>
                      {daysUntil(t.dueDate) >= 0 ? `${daysUntil(t.dueDate)}d left` : `${Math.abs(daysUntil(t.dueDate))}d overdue`}
                    </Badge>
                  </div>
                  <div className="mt-2 font-mono tabular-nums text-sm font-bold text-ud-text-primary">
                    <CurrencyDisplay amount={t.amount} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <Link
        href="/ai-assistant"
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 w-14 h-14 rounded-full gradient-teal flex items-center justify-center shadow-elevated hover:scale-105 transition-transform"
        aria-label="Open AI Assistant"
      >
        <div className="absolute inset-0 rounded-full bg-ud-primary-glow opacity-0 animate-pulse-soft" />
        <Sparkles className="w-6 h-6 text-white relative z-10" />
      </Link>
    </PageWrapper>
  );
}

function Section({ title, subtitle, children, className, headerRight }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string; headerRight?: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`bg-white rounded-2xl border border-ud-border p-5 shadow-card ${className ?? ""}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-base text-ud-text-primary">{title}</h3>
          {subtitle && <p className="text-xs text-ud-text-muted mt-0.5">{subtitle}</p>}
        </div>
        {headerRight}
      </div>
      {children}
    </motion.section>
  );
}
