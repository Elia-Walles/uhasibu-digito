"use client";
import { useAdminAudit } from "@/lib/hooks/admin/useAdminAudit";
import { AdminPageTitle, AdminPanel } from "@/components/admin/primitives";
import { AdminTable } from "@/components/admin/AdminTable";
import type { AdminAuditRow } from "@/lib/server/actions/admin/types";

export default function AdminAuditPage() {
  const { entries, loading } = useAdminAudit();

  return (
    <div>
      <AdminPageTitle title="Audit log" subtitle="Every action taken by platform operators." />
      <AdminPanel>
        {loading ? (
          <div className="py-14 text-center text-sm text-ud-text-muted">Loading…</div>
        ) : (
          <AdminTable<AdminAuditRow>
            data={entries}
            rowKey={(e) => e.id}
            caption="Platform audit log"
            emptyLabel="No operator actions recorded yet."
            columns={[
              { key: "createdAt", label: "When", render: (e) => e.createdAt.replace("T", " ").slice(0, 16) },
              { key: "actorEmail", label: "Operator" },
              { key: "action", label: "Action", render: (e) => <span className="font-mono text-xs text-ud-primary">{e.action}</span> },
              { key: "targetType", label: "Target", render: (e) => `${e.targetType}` },
              { key: "details", label: "Details", render: (e) => (
                <span className="text-ud-text-muted text-xs">{e.details || ""}</span>
              ) },
            ]}
          />
        )}
      </AdminPanel>
    </div>
  );
}
