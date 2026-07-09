"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { ShieldCheck, ShieldOff, Pencil, Power, Trash2 } from "lucide-react";
import { useAdminUsers } from "@/lib/hooks/admin/useAdminUsers";
import { AdminPageTitle, AdminPanel, StatusPill } from "@/components/admin/primitives";
import { AdminTable } from "@/components/admin/AdminTable";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useT } from "@/lib/hooks/useT";
import type { UserRole } from "@/types";
import type { AdminUserRow } from "@/lib/server/actions/admin/types";

const ROLE_OPTIONS = ["Admin", "CFO", "Finance Manager", "Accountant", "Data Entry", "HR Manager", "Auditor"].map((r) => ({
  value: r,
  label: r,
}));

type PendingAction = { type: "deactivate" | "delete"; user: AdminUserRow } | null;

export default function AdminUsersPage() {
  const t = useT();
  const { users, loading, changeRole, grant, revoke, editUser, setDisabled, deleteUser } = useAdminUsers();
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);

  const openEdit = (u: AdminUserRow) => {
    setEditing(u);
    setName(u.name);
    setEmail(u.email);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const res = await editUser(editing.id, name, email);
    setSaving(false);
    if (res.ok) {
      toast.success(t("User updated"));
      setEditing(null);
    } else toast.error(res.error);
  };

  const onRole = async (userId: string, role: UserRole) => {
    const res = await changeRole(userId, role);
    res.ok ? toast.success(t("Role updated")) : toast.error(res.error);
  };

  const onToggle = async (u: AdminUserRow) => {
    const res = u.isSuperAdmin ? await revoke(u.id) : await grant(u.id);
    res.ok ? toast.success(u.isSuperAdmin ? t("Super-admin revoked") : t("Super-admin granted")) : toast.error(res.error);
  };

  const onDeactivate = async (u: AdminUserRow) => {
    const res = await setDisabled(u.id, true);
    if (res.ok) {
      toast.success(t("User deactivated"));
    } else toast.error(res.error);
    setPending(null);
  };

  const onActivate = async (u: AdminUserRow) => {
    const res = await setDisabled(u.id, false);
    if (res.ok) {
      toast.success(t("User reactivated"));
    } else toast.error(res.error);
  };

  const onDelete = async (u: AdminUserRow) => {
    const res = await deleteUser(u.id);
    if (res.ok) {
      toast.success(t("User permanently deleted"));
    } else toast.error(res.error);
    setPending(null);
  };

  return (
    <div>
      <AdminPageTitle title={t("Users")} subtitle={t("Every user account across all tenants.")} />
      <AdminPanel>
        {loading ? (
          <div className="py-14 text-center text-sm text-ud-text-muted">{t("Loading users…")}</div>
        ) : (
          <AdminTable<AdminUserRow>
            data={users}
            rowKey={(u) => u.id}
            caption={t("Users")}
            emptyLabel={t("No users yet.")}
            columns={[
              { key: "name", label: t("User"), render: (u) => (
                <div>
                  <div className="text-ud-text-primary font-medium">{u.name || ""}</div>
                  <div className="text-ud-text-muted text-xs">{u.email}</div>
                </div>
              ) },
              { key: "tenantName", label: t("Tenant"), render: (u) => u.tenantName ?? <span className="text-ud-text-faint"></span> },
              { key: "role", label: t("Role"), render: (u) => (
                <div className="w-40" onClick={(e) => e.stopPropagation()}>
                  <Select value={u.role} onValueChange={(v) => onRole(u.id, v as UserRole)} options={ROLE_OPTIONS} />
                </div>
              ) },
              { key: "status", label: t("Status"), render: (u) => (
                <StatusPill value={u.disabledAt ? "disabled" : "active"} />
              ) },
              { key: "isSuperAdmin", label: t("Super-admin"), render: (u) =>
                u.isSuperAdmin ? <StatusPill value="active" /> : <span className="text-ud-text-faint">{t("No")}</span> },
              { key: "actions", label: "", align: "right", render: (u) => (
                <div className="flex items-center justify-end gap-3">
                  <button onClick={() => openEdit(u)} className="inline-flex items-center gap-1.5 text-xs text-ud-text-muted hover:text-ud-text-primary">
                    <Pencil className="w-3.5 h-3.5" /> {t("Edit")}
                  </button>
                  {u.disabledAt ? (
                    <button onClick={() => onActivate(u)} className="inline-flex items-center gap-1.5 text-xs text-ud-text-muted hover:text-ud-success">
                      <Power className="w-3.5 h-3.5" /> {t("Activate")}
                    </button>
                  ) : (
                    <button onClick={() => setPending({ type: "deactivate", user: u })} className="inline-flex items-center gap-1.5 text-xs text-ud-text-muted hover:text-ud-danger">
                      <Power className="w-3.5 h-3.5" /> {t("Deactivate")}
                    </button>
                  )}
                  <button
                    onClick={() => setPending({ type: "delete", user: u })}
                    className="inline-flex items-center gap-1.5 text-xs text-ud-text-muted hover:text-ud-danger"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {t("Delete")}
                  </button>
                  <button
                    onClick={() => onToggle(u)}
                    className="inline-flex items-center gap-1.5 text-xs text-ud-text-muted hover:text-ud-text-primary"
                  >
                    {u.isSuperAdmin ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    {u.isSuperAdmin ? t("Revoke") : t("Grant")}
                  </button>
                </div>
              ) },
            ]}
          />
        )}
      </AdminPanel>

      <Modal open={!!editing} onOpenChange={(v) => !v && setEditing(null)} title={t("Edit {name}", { name: editing?.name ?? t("user") })} size="lg">
        <div className="space-y-4">
          <Input label={t("Name")} value={name} onChange={(e) => setName(e.target.value)} />
          <Input label={t("Email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>{t("Cancel")}</Button>
            <Button onClick={save} loading={saving}>{t("Save")}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        title={
          pending?.type === "delete"
            ? t("Permanently delete this user?")
            : t("Deactivate user?")
        }
        message={
          pending?.type === "delete"
            ? t("This erases their name, email, login credentials and sessions forever. Invoices, sales and other records they created will remain but will no longer show their name. This cannot be undone.")
            : t("This user will no longer be able to sign in. You can reactivate them anytime.")
        }
        confirmLabel={
          pending?.type === "delete" ? t("Permanently delete") : t("Deactivate")
        }
        variant="danger"
        onConfirm={() => {
          if (!pending) return;
          if (pending.type === "delete") {
            onDelete(pending.user);
          } else {
            onDeactivate(pending.user);
          }
        }}
      />
    </div>
  );
}
