"use client";
import toast from "react-hot-toast";
import { useAdminSubscriptions } from "@/lib/hooks/admin/useAdminSubscriptions";
import { AdminPageTitle, AdminPanel, StatusPill } from "@/components/admin/primitives";
import { AdminTable } from "@/components/admin/AdminTable";
import { formatTZS } from "@/lib/utils/currency";
import type { AdminSubscriptionRow } from "@/lib/server/actions/admin/types";

export default function AdminSubscriptionsPage() {
  const { subscriptions, loading, cancel } = useAdminSubscriptions();

  const onCancel = async (id: string) => {
    const res = await cancel(id);
    res.ok ? toast.success("Subscription canceled") : toast.error(res.error);
  };

  return (
    <div>
      <AdminPageTitle title="Subscriptions" subtitle="Every subscription across the platform." />
      <AdminPanel>
        {loading ? (
          <div className="py-14 text-center text-sm text-ud-text-muted">Loading…</div>
        ) : (
          <AdminTable<AdminSubscriptionRow>
            data={subscriptions}
            rowKey={(s) => s.id}
            caption="Subscriptions"
            emptyLabel="No subscriptions yet."
            columns={[
              { key: "tenantName", label: "Tenant", render: (s) => s.tenantName ?? s.tenantId },
              { key: "planName", label: "Plan" },
              { key: "status", label: "Status", render: (s) => <StatusPill value={s.status} /> },
              { key: "amountTzs", label: "Amount", align: "right", render: (s) => formatTZS(s.amountTzs, true) },
              { key: "startedAt", label: "Started", render: (s) => s.startedAt.slice(0, 10) },
              { key: "currentPeriodEnd", label: "Renews", render: (s) => s.currentPeriodEnd?.slice(0, 10) ?? "" },
              { key: "actions", label: "", align: "right", render: (s) =>
                s.status === "active" ? (
                  <button onClick={() => onCancel(s.id)} className="text-xs text-ud-danger hover:text-red-700">Cancel</button>
                ) : null },
            ]}
          />
        )}
      </AdminPanel>
    </div>
  );
}
