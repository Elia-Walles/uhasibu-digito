"use client";
import { useMemo, useState } from "react";
import { Plus, Loader2, ShieldAlert, Mail, RefreshCw, UserX, UserCheck, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { useT } from "@/lib/hooks/useT";
import { useStaff } from "@/lib/hooks/useStaff";
import { useBranches } from "@/lib/hooks/useBranches";
import { useCurrentUser } from "@/lib/auth/client";
import { INVITABLE_ROLES, isBranchRestricted } from "@/lib/auth/roles";
import type { UserRole } from "@/types";
import type { StaffMember } from "@/lib/server/actions/staff";
import toast from "react-hot-toast";

const ROLE_COLOR: Record<string, "danger" | "gold" | "info" | "teal" | "default" | "warning" | "obsidian" | "success"> = {
  Admin: "danger",
  CFO: "gold",
  "Finance Manager": "info",
  Accountant: "teal",
  "Data Entry": "default",
  "HR Manager": "warning",
  Auditor: "obsidian",
  "Branch Manager": "info",
  Cashier: "teal",
};

const STATUS_COLOR = { active: "success", pending: "warning", disabled: "default" } as const;

export default function UsersPage() {
  const t = useT();
  const me = useCurrentUser();
  const { staff, loading, forbidden, invite, update, setDisabled, resend } = useStaff();
  const { branches } = useBranches();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("Cashier");
  const [branchId, setBranchId] = useState("");
  const [busy, setBusy] = useState(false);

  const branchOptions = useMemo(() => branches.map((b) => ({ value: b.id, label: b.name })), [branches]);
  const needsBranch = isBranchRestricted(role);

  function openInvite() {
    setEditing(null);
    setName("");
    setEmail("");
    setRole("Cashier");
    setBranchId(branches.find((b) => b.isPrimary)?.id ?? branches[0]?.id ?? "");
    setOpen(true);
  }

  function openEdit(s: StaffMember) {
    setEditing(s);
    setName(s.name);
    setEmail(s.email);
    setRole(s.role);
    setBranchId(s.branchId ?? "");
    setOpen(true);
  }

  async function submit() {
    if (needsBranch && !branchId) {
      toast.error(t("Select a branch for this role"));
      return;
    }
    setBusy(true);
    try {
      const res = editing
        ? await update({ id: editing.id, role, ...(needsBranch ? { branchId } : { branchId: "" }) })
        : await invite({ name, email, role, ...(needsBranch ? { branchId } : {}) });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const data = res.data;
      if (!editing && typeof data === "object" && "devLink" in data && data.devLink) {
        toast.success(t("Invited — dev link in console"));
        // eslint-disable-next-line no-console
        console.log("[invite] set-password link:", data.devLink);
      } else {
        toast.success(editing ? t("Staff updated") : t("Invitation sent"));
      }
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function onResend(s: StaffMember) {
    const res = await resend(s.id);
    if (!res.ok) return toast.error(res.error);
    toast.success(t("Invitation re-sent"));
    if (res.data.devLink) console.log("[invite] set-password link:", res.data.devLink); // eslint-disable-line no-console
  }

  async function onToggleDisabled(s: StaffMember) {
    const res = await setDisabled(s.id, s.status !== "disabled");
    if (!res.ok) toast.error(res.error);
    else toast.success(s.status === "disabled" ? t("Reactivated") : t("Deactivated"));
  }

  if (me && me.role !== "Admin") {
    return (
      <div className="bg-white border border-ud-border rounded-2xl shadow-card p-8">
        <EmptyState
          icon={ShieldAlert}
          title={t("Admins only")}
          description={t("Only the account owner can manage staff and their branches.")}
        />
      </div>
    );
  }

  return (
    <div className="bg-white border border-ud-border rounded-2xl shadow-card overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-ud-border">
        <div>
          <h2 className="font-display font-bold text-lg">{t("Users & roles")}</h2>
          <p className="text-xs text-ud-text-muted">{t("Invite staff and assign each to a branch")}</p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openInvite}>{t("Invite staff")}</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-ud-text-muted">
          <Loader2 className="w-4 h-4 animate-spin" /> {t("Loading…")}
        </div>
      ) : forbidden ? (
        <div className="p-8"><EmptyState icon={ShieldAlert} title={t("Admins only")} description={t("Only the account owner can manage staff.")} /></div>
      ) : (
        <div className="divide-y divide-ud-border">
          {staff.map((s) => {
            const isMe = s.id === me?.id;
            return (
              <div key={s.id} className="flex flex-wrap items-center gap-3 sm:gap-4 px-5 py-3">
                <Avatar initials={(s.name || s.email).slice(0, 2).toUpperCase()} src={null} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{s.name || "—"}{isMe && <span className="text-ud-text-muted font-normal"> ({t("you")})</span>}</div>
                  <div className="text-xs text-ud-text-muted truncate">{s.email}</div>
                </div>
                <Badge variant={ROLE_COLOR[s.role] ?? "default"}>{s.role}</Badge>
                <div className="text-xs text-ud-text-muted hidden md:block w-28 truncate text-right">{s.branchName || "—"}</div>
                <Badge variant={STATUS_COLOR[s.status]}>{t(s.status === "active" ? "Active" : s.status === "pending" ? "Pending" : "Disabled")}</Badge>
                {!isMe && !s.isAdmin && (
                  <div className="flex items-center gap-1">
                    {s.status === "pending" && (
                      <Button variant="ghost" size="sm" aria-label={t("Resend invite")} onClick={() => void onResend(s)} icon={<RefreshCw className="w-3.5 h-3.5" />}>{t("Resend")}</Button>
                    )}
                    <Button variant="ghost" size="sm" aria-label={t("Edit")} onClick={() => openEdit(s)} icon={<Pencil className="w-3.5 h-3.5" />} />
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={s.status === "disabled" ? t("Reactivate") : t("Deactivate")}
                      onClick={() => void onToggleDisabled(s)}
                      icon={s.status === "disabled" ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={editing ? t("Edit staff") : t("Invite staff")}
        description={editing ? t("Change this person's role or branch.") : t("They'll get an email to set their password.")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
            <Button variant="primary" loading={busy} onClick={() => void submit()} icon={!editing ? <Mail className="w-4 h-4" /> : undefined}>
              {editing ? t("Save changes") : t("Send invite")}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label={t("Full name")} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("e.g. Mary Ndungu")} disabled={!!editing} />
          <Input label={t("Email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.co.tz" disabled={!!editing} />
          <Select
            label={t("Role")}
            value={role}
            onValueChange={(v) => setRole(v as UserRole)}
            options={INVITABLE_ROLES.map((r) => ({ value: r, label: r }))}
          />
          {needsBranch && (
            <Select
              label={t("Branch")}
              value={branchId}
              onValueChange={setBranchId}
              placeholder={branches.length ? t("Select branch") : t("Create a branch first")}
              options={branchOptions}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
