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
import { useT } from "@/lib/hooks/useT";
import type { AdminPaymentRow } from "@/lib/server/actions/admin/types";

export default function AdminPaymentsPage() {
  const t = useT();
  const { payments, loading, reverse, refresh } = useAdminPayments();
  const { tenants } = useAdminTenants();
  const [open, setOpen] = useState(false);

  const onReverse = async (id: string) => {
    const res = await reverse(id);
    res.ok ? toast.success(t("Payment reversed")) : toast.error(res.error);
  };

  return (
    <div>
      <AdminPageTitle
        title={t("Payments")}
        subtitle={t("Manually recorded subscription payments.")}
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setOpen(true)}>
            {t("Record payment")}
          </Button>
        }
      />
      <AdminPanel>
        {loading ? (
          <div className="py-14 text-center text-sm text-ud-text-muted">{t("Loading…")}</div>
        ) : (
          <AdminTable<AdminPaymentRow>
            data={payments}
            rowKey={(p) => p.id}
            caption={t("Payments")}
            emptyLabel={t("No payments recorded yet.")}
            columns={[
              { key: "tenantName", label: t("Tenant"), render: (p) => p.tenantName ?? p.tenantId },
              { key: "paidAt", label: t("Paid on"), render: (p) => p.paidAt.slice(0, 10) },
              { key: "method", label: t("Method"), render: (p) => <span className="capitalize">{p.method}</span> },
              { key: "reference", label: t("Reference"), render: (p) => p.reference || "" },
              { key: "status", label: t("Status"), render: (p) => <StatusPill value={p.status} /> },
              { key: "amountTzs", label: t("Amount"), align: "right", render: (p) => formatTZS(p.amountTzs, true) },
              { key: "actions", label: "", align: "right", render: (p) =>
                p.status === "recorded" ? (
                  <button onClick={() => onReverse(p.id)} className="text-xs text-ud-danger hover:text-red-700">{t("Reverse")}</button>
                ) : null },
            ]}
          />
        )}
      </AdminPanel>

      <RecordPaymentModal
        open={open}
        onOpenChange={setOpen}
        tenantOptions={tenants.map((tenant) => ({ value: tenant.id, label: tenant.name }))}
        onDone={refresh}
      />
    </div>
  );
}
