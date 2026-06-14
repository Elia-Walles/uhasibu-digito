"use client";
import toast from "react-hot-toast";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { useAdminUsers } from "@/lib/hooks/admin/useAdminUsers";
import { AdminPageTitle, AdminPanel, StatusPill } from "@/components/admin/primitives";
import { AdminTable } from "@/components/admin/AdminTable";
import { Select } from "@/components/ui/Select";
import type { UserRole } from "@/types";
import type { AdminUserRow } from "@/lib/server/actions/admin/types";

const ROLE_OPTIONS = ["Admin", "CFO", "Finance Manager", "Accountant", "Data Entry", "HR Manager", "Auditor"].map((r) => ({
  value: r,
  label: r,
}));

export default function AdminUsersPage() {
  const { users, loading, changeRole, grant, revoke } = useAdminUsers();

  const onRole = async (userId: string, role: UserRole) => {
    const res = await changeRole(userId, role);
    res.ok ? toast.success("Role updated") : toast.error(res.error);
  };

  const onToggle = async (u: AdminUserRow) => {
    const res = u.isSuperAdmin ? await revoke(u.id) : await grant(u.id);
    res.ok ? toast.success(u.isSuperAdmin ? "Super-admin revoked" : "Super-admin granted") : toast.error(res.error);
  };

  return (
    <div>
      <AdminPageTitle title="Users" subtitle="Every user account across all tenants." />
      <AdminPanel>
        {loading ? (
          <div className="py-14 text-center text-sm text-ud-text-muted">Loading users…</div>
        ) : (
          <AdminTable<AdminUserRow>
            data={users}
            rowKey={(u) => u.id}
            caption="Users"
            emptyLabel="No users yet."
            columns={[
              { key: "name", label: "User", render: (u) => (
                <div>
                  <div className="text-ud-text-primary font-medium">{u.name || ""}</div>
                  <div className="text-ud-text-muted text-xs">{u.email}</div>
                </div>
              ) },
              { key: "tenantName", label: "Tenant", render: (u) => u.tenantName ?? <span className="text-ud-text-faint"></span> },
              { key: "role", label: "Role", render: (u) => (
                <div className="w-40" onClick={(e) => e.stopPropagation()}>
                  <Select value={u.role} onValueChange={(v) => onRole(u.id, v as UserRole)} options={ROLE_OPTIONS} />
                </div>
              ) },
              { key: "isSuperAdmin", label: "Super-admin", render: (u) =>
                u.isSuperAdmin ? <StatusPill value="active" /> : <span className="text-ud-text-faint">No</span> },
              { key: "actions", label: "", align: "right", render: (u) => (
                <button
                  onClick={() => onToggle(u)}
                  className="inline-flex items-center gap-1.5 text-xs text-ud-text-muted hover:text-ud-text-primary"
                >
                  {u.isSuperAdmin ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  {u.isSuperAdmin ? "Revoke" : "Grant"}
                </button>
              ) },
            ]}
          />
        )}
      </AdminPanel>
    </div>
  );
}
