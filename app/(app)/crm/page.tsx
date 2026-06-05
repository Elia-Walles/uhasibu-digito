"use client";
import Link from "next/link";
import { Users, KanbanSquare, UserPlus } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { StatRowSkeleton } from "@/components/skeletons/StatRowSkeleton";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { usePipelineDeals } from "@/lib/hooks/usePipelineDeals";

export default function CRMHome() {
  const { customers, loading: custLoading } = useCustomers();
  const { deals, loading: dealsLoading } = usePipelineDeals();
  const loading = custLoading || dealsLoading;
  const totalDeals     = deals.reduce((s, d) => s + d.value, 0);
  const totalCustomers = customers.length;
  const topCustomers   = [...customers].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);

  return (
    <PageWrapper>
      <PageHeader
        title="CRM"
        subtitle="Customers, leads, and sales pipeline"
        actions={
          <>
            <Link href="/crm/customers"><Button variant="outline" icon={<Users className="w-4 h-4" />}>Customers</Button></Link>
            <Link href="/crm/pipeline"><Button variant="primary" icon={<KanbanSquare className="w-4 h-4" />}>Pipeline</Button></Link>
          </>
        }
      />

      {loading ? <StatRowSkeleton /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total customers"    value={totalCustomers}            variant="teal"    format="raw" trendValue={6.7} />
          <StatCard label="Pipeline value"     value={totalDeals}                variant="emerald" format="compact" prefix="TSh" trendValue={11.3} />
          <StatCard label="Active deals"       value={deals.filter((d) => d.stage !== "Won" && d.stage !== "Lost").length} variant="blue" format="raw" />
          <StatCard label="Won this month"     value={deals.filter((d) => d.stage === "Won").length} variant="amber" format="raw" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-white border border-ud-border rounded-2xl p-5 shadow-card">
          <h3 className="font-display font-bold text-base mb-4">Pipeline by stage</h3>
          <div className="space-y-2">
            {(["Lead", "Qualified", "Proposal", "Negotiation", "Won"] as const).map((st) => {
              const inStage = deals.filter((x) => x.stage === st);
              const total = inStage.reduce((s, x) => s + x.value, 0);
              return (
                <div key={st} className="flex items-center justify-between p-2.5 rounded-xl bg-ud-surface-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{st}</span>
                    <span className="text-xs text-ud-text-muted">{inStage.length}</span>
                  </div>
                  <CurrencyDisplay amount={total} compact className="font-medium" />
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card">
          <h3 className="font-display font-bold text-base mb-4">Top customers (YTD)</h3>
          <div className="space-y-3">
            {topCustomers.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-ud-primary-50 text-ud-primary text-xs font-bold flex items-center justify-center">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <div className="text-xs text-ud-text-muted truncate">{c.city}</div>
                </div>
                <CurrencyDisplay amount={c.totalRevenue} compact className="text-sm font-medium" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <Link href="/crm/leads" className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-ud-border hover:border-ud-primary transition-colors max-w-md">
        <div className="w-10 h-10 rounded-xl bg-ud-primary-50 flex items-center justify-center">
          <UserPlus className="w-4 h-4 text-ud-primary" />
        </div>
        <div>
          <div className="font-medium">Leads</div>
          <div className="text-xs text-ud-text-muted">Track and qualify potential customers</div>
        </div>
      </Link>
    </PageWrapper>
  );
}
