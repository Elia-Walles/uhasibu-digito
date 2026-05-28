"use client";
import { Lock } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { AUDIT_LOG } from "@/lib/mock-data/audit-log";
import { formatDateTime } from "@/lib/utils/dates";
import type { AuditLog, AuditAction } from "@/types";

const ACTION_COLOR: Record<AuditAction, "success" | "info" | "danger" | "warning" | "teal" | "gold" | "default"> = {
  Created: "success", Modified: "info", Deleted: "danger", LoggedIn: "default", Exported: "teal", Stamped: "gold", Approved: "warning",
};

const COLS: Column<AuditLog>[] = [
  { key: "timestamp", label: "Timestamp", sortable: true, render: (r) => formatDateTime(r.timestamp) },
  { key: "userName",  label: "User", render: (r) => (
    <div className="flex items-center gap-2">
      <Avatar initials={r.userName.split(" ").map((s) => s[0]).join("")} size="xs" />
      <span className="text-sm font-medium">{r.userName}</span>
    </div>
  ) },
  { key: "action", label: "Action", render: (r) => <Badge variant={ACTION_COLOR[r.action]}>{r.action}</Badge> },
  { key: "module", label: "Module" },
  { key: "details", label: "Details", render: (r) => <span className="text-ud-text-secondary text-sm">{r.details}</span> },
  { key: "ipAddress", label: "IP", className: "font-mono text-xs text-ud-text-muted" },
];

export default function AuditTrailPage() {
  return (
    <div>
      <div className="mb-4 p-3 rounded-xl bg-ud-info-bg border border-ud-info/20 flex items-center gap-2 text-sm text-ud-info">
        <Lock className="w-4 h-4" />
        <span>Audit trail is immutable. Records cannot be edited or deleted.</span>
      </div>
      <DataTable data={AUDIT_LOG} columns={COLS} pageSize={15} initialSortKey="timestamp" initialSortDir="desc" rowKey={(r) => r.id} />
    </div>
  );
}
