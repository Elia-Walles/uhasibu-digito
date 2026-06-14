"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import { useAdminPayments } from "@/lib/hooks/admin/useAdminPayments";
import { useAdminTenants } from "@/lib/hooks/admin/useAdminTenants";
import { AdminPageTitle, AdminPanel, StatusPill } from "@/components/admin/primitives";
import { AdminTable } from "@/components/admin/AdminTable";
import { RecordPaymentModal } from "@/components/admin/RecordPaymentModal";
import { Button } from "@/components/ui/Button";
import { formatTZS } from "@/lib/utils/currency";
import type { AdminPaymentRow } from "@/lib/server/actions/admin/types";

export default function AdminPaymentsPage() {
  const { payments, loading, reverse, refresh } = useAdminPayments();
  const { tenants } = useAdminTenants();
  const [open, setOpen] = useState(false);

  const onReverse = async (id: string) => {
    const res = await reverse(id);
    res.ok ? toast.success("Payment reversed") : toast.error(res.error);
  };

  return (
    <div>
      <AdminPageTitle
        title="Payments"
        subtitle="Manually recorded subscription payments."
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setOpen(true)}>
            Record payment
          </Button>
        }
      />
      <AdminPanel>
        {loading ? (
          <div className="py-14 text-center text-sm text-ud-text-muted">Loading…</div>
        ) : (
          <AdminTable<AdminPaymentRow>
            data={payments}
            rowKey={(p) => p.id}
            caption="Payments"
            emptyLabel="No payments recorded yet."
            columns={[
              { key: "tenantName", label: "Tenant", render: (p) => p.tenantName ?? p.tenantId },
              { key: "paidAt", label: "Paid on", render: (p) => p.paidAt.slice(0, 10) },
              { key: "method", label: "Method", render: (p) => <span className="capitalize">{p.method}</span> },
              { key: "reference", label: "Reference", render: (p) => p.reference || "" },
              { key: "status", label: "Status", render: (p) => <StatusPill value={p.status} /> },
              { key: "amountTzs", label: "Amount", align: "right", render: (p) => formatTZS(p.amountTzs, true) },
              { key: "actions", label: "", align: "right", render: (p) =>
                p.status === "recorded" ? (
                  <button onClick={() => onReverse(p.id)} className="text-xs text-ud-danger hover:text-red-700">Reverse</button>
                ) : null },
            ]}
          />
        )}
      </AdminPanel>

      <RecordPaymentModal
        open={open}
        onOpenChange={setOpen}
        tenantOptions={tenants.map((t) => ({ value: t.id, label: t.name }))}
        onDone={refresh}
      />
    </div>
  );
}
