"use client";
import { useAdminOverview } from "@/lib/hooks/admin/useAdminOverview";
import { AdminPageTitle, AdminPanel, AdminKpi } from "@/components/admin/primitives";
import { formatTZS } from "@/lib/utils/currency";
import { useT } from "@/lib/hooks/useT";

export default function AdminOverviewPage() {
  const t = useT();
  const { overview, loading } = useAdminOverview();

  if (loading || !overview) {
    return (
      <div>
        <AdminPageTitle title={t("Platform overview")} subtitle={t("Loading platform metrics…")} />
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
      <AdminPageTitle title={t("Platform overview")} subtitle={t("The whole business of Uhasibu Digito, at a glance.")} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKpi index={0} label={t("Tenants")} value={String(o.totalTenants)} hint={t("{n} with active plan", { n: o.activeTenants })} />
        <AdminKpi index={1} label={t("MRR")} value={formatTZS(o.mrrTzs)} hint={t("{amount} ARR", { amount: formatTZS(o.arrTzs) })} />
        <AdminKpi index={2} label={t("Users")} value={String(o.totalUsers)} hint={t("{n} super-admins", { n: o.superAdmins })} />
        <AdminKpi index={3} label={t("Signups this month")} value={String(o.signupsThisMonth)} />
        <AdminKpi index={4} label={t("Payments this month")} value={formatTZS(o.paymentsThisMonthTzs)} />
        {o.tenantsByTier.map((row, i) => (
          <AdminKpi key={row.tier} index={5 + i} label={t("{tier} tenants", { tier: row.tier })} value={String(row.count)} />
        ))}
      </div>

      <AdminPanel title={t("Tenants by tier")} className="mt-6">
        <div className="space-y-3">
          {o.tenantsByTier.map((row) => {
            const pct = o.totalTenants ? Math.round((row.count / o.totalTenants) * 100) : 0;
            return (
              <div key={row.tier}>
                <div className="flex items-center justify-between text-sm text-ud-text-secondary mb-1">
                  <span className="capitalize">{row.tier}</span>
                  <span className="tabular-nums">{row.count} · {pct}%</span>
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
