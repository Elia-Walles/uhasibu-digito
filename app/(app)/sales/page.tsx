"use client";
import Link from "next/link";
import { FilePlus2, FileText, CreditCard, TrendingUp } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { StatRowSkeleton } from "@/components/skeletons/StatRowSkeleton";
import { ChartSkeleton } from "@/components/skeletons/ChartSkeleton";
import { useLoadingSimulation } from "@/lib/hooks/useLoadingSimulation";
import { useInvoices } from "@/lib/hooks/useInvoices";

export default function SalesPage() {
  const { invoices, loading: invLoading } = useInvoices();
  const loading = useLoadingSimulation(800) || invLoading;
  const totalSales    = invoices.filter((i) => i.status !== "Cancelled" && i.status !== "Draft").reduce((s, i) => s + i.total, 0);
  const totalPaid     = invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + i.total, 0);
  const totalOverdue  = invoices.filter((i) => i.status === "Overdue").reduce((s, i) => s + i.total, 0);
  const overdueCount  = invoices.filter((i) => i.status === "Overdue").length;

  return (
    <PageWrapper>
      <PageHeader
        title="Sales"
        subtitle="Invoices, quotations, and customer payments"
        actions={
          <>
            <Link href="/sales/invoices"><Button variant="outline" icon={<FileText className="w-4 h-4" />}>Invoices</Button></Link>
            <Link href="/sales/new-invoice"><Button variant="primary" icon={<FilePlus2 className="w-4 h-4" />}>New invoice</Button></Link>
          </>
        }
      />

      {loading ? <StatRowSkeleton /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total sales YTD" value={totalSales}   variant="teal"    prefix="TSh" trendValue={12.4} format="compact" />
          <StatCard label="Collected"       value={totalPaid}    variant="emerald" prefix="TSh" trendValue={8.1} format="compact" />
          <StatCard label="Overdue"         value={totalOverdue} variant="amber"   prefix="TSh" trendValue={4.2} trendInvert format="compact" footer={`${overdueCount} invoices`} />
          <StatCard label="Active invoices" value={invoices.filter((i) => i.status === "Sent").length} variant="blue" format="raw" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-white border border-ud-border rounded-2xl p-5 shadow-card">
          <h3 className="font-display font-bold text-base mb-3">Revenue trend</h3>
          {loading ? <ChartSkeleton /> : <RevenueChart />}
        </div>
        <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card">
          <h3 className="font-display font-bold text-base mb-3">Invoice status</h3>
          <div className="space-y-3">
            {[
              { status: "Paid",      count: invoices.filter((i) => i.status === "Paid").length,      color: "bg-ud-success" },
              { status: "Sent",      count: invoices.filter((i) => i.status === "Sent").length,      color: "bg-ud-info" },
              { status: "Overdue",   count: overdueCount,                                            color: "bg-ud-danger" },
              { status: "Draft",     count: invoices.filter((i) => i.status === "Draft").length,     color: "bg-ud-warning" },
              { status: "Cancelled", count: invoices.filter((i) => i.status === "Cancelled").length, color: "bg-ud-text-muted" },
            ].map((s) => (
              <div key={s.status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${s.color}`} />
                  <span className="text-sm text-ud-text-secondary">{s.status}</span>
                </div>
                <span className="text-sm font-mono font-medium">{s.count}</span>
              </div>
            ))}
          </div>
          <Link href="/sales/invoices" className="block mt-4">
            <Button variant="secondary" fullWidth>View all invoices</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Quotations", href: "/sales/quotations", icon: FileText },
          { label: "Payments",   href: "/sales/payments",   icon: CreditCard },
          { label: "Top items",  href: "/inventory/items",   icon: TrendingUp },
        ].map((q) => {
          const Icon = q.icon;
          return (
            <Link key={q.label} href={q.href} className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-ud-border hover:border-ud-primary transition-colors">
              <div className="w-10 h-10 rounded-xl bg-ud-primary-50 flex items-center justify-center">
                <Icon className="w-4 h-4 text-ud-primary" />
              </div>
              <div className="font-medium">{q.label}</div>
            </Link>
          );
        })}
      </div>
    </PageWrapper>
  );
}
