"use client";
import { useAdminOverview } from "@/lib/hooks/admin/useAdminOverview";
import { AdminPageTitle, AdminPanel, AdminKpi } from "@/components/admin/primitives";
import { formatTZS } from "@/lib/utils/currency";

export default function AdminOverviewPage() {
  const { overview, loading } = useAdminOverview();

  if (loading || !overview) {
    return (
      <div>
        <AdminPageTitle title="Platform overview" subtitle="Loading platform metrics…" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-ud-surface border border-ud-border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const o = overview;
  return (
    <div>
      <AdminPageTitle title="Platform overview" subtitle="The whole business of Uhasibu Digito, at a glance." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKpi index={0} label="Tenants" value={String(o.totalTenants)} hint={`${o.activeTenants} with active plan`} />
        <AdminKpi index={1} label="MRR" value={formatTZS(o.mrrTzs, true)} hint={`${formatTZS(o.arrTzs, true)} ARR`} />
        <AdminKpi index={2} label="Users" value={String(o.totalUsers)} hint={`${o.superAdmins} super-admins`} />
        <AdminKpi index={3} label="Signups this month" value={String(o.signupsThisMonth)} />
        <AdminKpi index={4} label="Payments this month" value={formatTZS(o.paymentsThisMonthTzs, true)} />
        {o.tenantsByTier.map((t, i) => (
          <AdminKpi key={t.tier} index={5 + i} label={`${t.tier} tenants`} value={String(t.count)} />
        ))}
      </div>

      <AdminPanel title="Tenants by tier" className="mt-6">
        <div className="space-y-3">
          {o.tenantsByTier.map((t) => {
            const pct = o.totalTenants ? Math.round((t.count / o.totalTenants) * 100) : 0;
            return (
              <div key={t.tier}>
                <div className="flex items-center justify-between text-sm text-ud-text-secondary mb-1">
                  <span className="capitalize">{t.tier}</span>
                  <span className="tabular-nums">{t.count} · {pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-ud-surface-2 overflow-hidden">
                  <div className="h-full rounded-full bg-ud-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </AdminPanel>
    </div>
  );
}
