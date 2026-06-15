"use client";
import { useAdminAudit } from "@/lib/hooks/admin/useAdminAudit";
import { AdminPageTitle, AdminPanel } from "@/components/admin/primitives";
import { AdminTable } from "@/components/admin/AdminTable";
import { useT } from "@/lib/hooks/useT";
import type { AdminAuditRow } from "@/lib/server/actions/admin/types";

export default function AdminAuditPage() {
  const t = useT();
  const { entries, loading } = useAdminAudit();

  return (
    <div>
      <AdminPageTitle title={t("Audit log")} subtitle={t("Every action taken by platform operators.")} />
      <AdminPanel>
        {loading ? (
          <div className="py-14 text-center text-sm text-ud-text-muted">{t("Loading…")}</div>
        ) : (
          <AdminTable<AdminAuditRow>
            data={entries}
            rowKey={(e) => e.id}
            caption={t("Platform audit log")}
            emptyLabel={t("No operator actions recorded yet.")}
            columns={[
              { key: "createdAt", label: t("When"), render: (e) => e.createdAt.replace("T", " ").slice(0, 16) },
              { key: "actorEmail", label: t("Operator") },
              { key: "action", label: t("Action"), render: (e) => <span className="font-mono text-xs text-ud-primary">{e.action}</span> },
              { key: "targetType", label: t("Target"), render: (e) => `${e.targetType}` },
              { key: "details", label: t("Details"), render: (e) => (
                <span className="text-ud-text-muted text-xs">{e.details || ""}</span>
              ) },
            ]}
          />
        )}
      </AdminPanel>
    </div>
  );
}
