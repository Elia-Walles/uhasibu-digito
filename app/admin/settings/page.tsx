"use client";
import { useCurrentUser } from "@/lib/auth/client";
import { AdminPageTitle, AdminPanel } from "@/components/admin/primitives";

export default function AdminSettingsPage() {
  const user = useCurrentUser();

  return (
    <div>
      <AdminPageTitle title="Platform settings" subtitle="Operator account and platform configuration." />

      <div className="grid lg:grid-cols-2 gap-4">
        <AdminPanel title="Signed-in operator">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ud-text-muted">Name</dt>
              <dd className="text-ud-text-secondary">{user?.name ?? ""}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ud-text-muted">Email</dt>
              <dd className="text-ud-text-secondary">{user?.email ?? ""}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ud-text-muted">Access</dt>
              <dd className="text-ud-gold-dark">Super-admin</dd>
            </div>
          </dl>
        </AdminPanel>

        <AdminPanel title="About">
          <p className="text-sm text-ud-text-muted leading-relaxed">
            This is the Uhasibu Digito platform control room. Manage tenants, users, subscriptions,
            plans, and payments here. Tenant business data is available read-only for support.
            Grant or revoke super-admin access from the{" "}
            <span className="text-ud-text-primary">Users</span> page.
          </p>
        </AdminPanel>
      </div>
    </div>
  );
}
