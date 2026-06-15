"use client";
import { useCurrentUser } from "@/lib/auth/client";
import { AdminPageTitle, AdminPanel } from "@/components/admin/primitives";
import { useT } from "@/lib/hooks/useT";

export default function AdminSettingsPage() {
  const t = useT();
  const user = useCurrentUser();

  return (
    <div>
      <AdminPageTitle title={t("Platform settings")} subtitle={t("Operator account and platform configuration.")} />

      <div className="grid lg:grid-cols-2 gap-4">
        <AdminPanel title={t("Signed-in operator")}>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ud-text-muted">{t("Name")}</dt>
              <dd className="text-ud-text-secondary">{user?.name ?? ""}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ud-text-muted">{t("Email")}</dt>
              <dd className="text-ud-text-secondary">{user?.email ?? ""}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ud-text-muted">{t("Access")}</dt>
              <dd className="text-ud-gold-dark">{t("Super-admin")}</dd>
            </div>
          </dl>
        </AdminPanel>

        <AdminPanel title={t("About")}>
          <p className="text-sm text-ud-text-muted leading-relaxed">
            {t("This is the Uhasibu Digito platform control room. Manage tenants, users, subscriptions, plans, and payments here. Tenant business data is available read-only for support. Grant or revoke super-admin access from the Users page.")}
          </p>
        </AdminPanel>
      </div>
    </div>
  );
}
