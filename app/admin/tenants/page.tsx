"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import { useAdminTenants } from "@/lib/hooks/admin/useAdminTenants";
import { AdminPageTitle, AdminPanel, StatusPill } from "@/components/admin/primitives";
import { AdminTable } from "@/components/admin/AdminTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatTZS } from "@/lib/utils/currency";
import { useT } from "@/lib/hooks/useT";
import type { Tier } from "@/lib/auth/tiers";
import type { AdminTenantRow } from "@/lib/server/actions/admin/types";

const TIER_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "starter", label: "Starter" },
  { value: "business", label: "Business" },
  { value: "standard", label: "Standard" },
  { value: "premium", label: "Premium" },
];

export default function AdminTenantsPage() {
  const tr = useT();
  const router = useRouter();
  const { tenants, loading, addTenant } = useAdminTenants();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [tier, setTier] = useState<Tier>("free");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const res = await addTenant({ name, slug, tier });
    setSaving(false);
    if (res.ok) {
      toast.success(tr("Tenant created"));
      setOpen(false);
      setName("");
      setSlug("");
      setTier("free");
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div>
      <AdminPageTitle
        title={tr("Tenants")}
        subtitle={tr("Every organization on the platform.")}
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setOpen(true)}>
            {tr("New tenant")}
          </Button>
        }
      />

      <AdminPanel>
        {loading ? (
          <div className="py-14 text-center text-sm text-ud-text-muted">{tr("Loading tenants…")}</div>
        ) : (
          <AdminTable<AdminTenantRow>
            data={tenants}
            rowKey={(row) => row.id}
            onRowClick={(row) => router.push(`/admin/tenants/${row.id}`)}
            emptyLabel={tr("No tenants yet.")}
            caption={tr("Tenants")}
            columns={[
              { key: "name", label: tr("Name"), render: (row) => (
                <div>
                  <div className="text-ud-text-primary font-medium">{row.name}</div>
                  <div className="text-ud-text-muted text-xs">{row.slug}</div>
                </div>
              ) },
              { key: "tier", label: tr("Tier"), render: (row) => <StatusPill value={row.tier} /> },
              { key: "userCount", label: tr("Users"), align: "right" },
              { key: "subscriptionStatus", label: tr("Subscription"), render: (row) =>
                row.subscriptionStatus ? <StatusPill value={row.subscriptionStatus} /> : <span className="text-ud-text-faint"></span> },
              { key: "mrrTzs", label: tr("MRR"), align: "right", render: (row) => formatTZS(row.mrrTzs, true) },
              { key: "createdAt", label: tr("Joined"), render: (row) => row.createdAt.slice(0, 10) },
            ]}
          />
        )}
      </AdminPanel>

      <Modal open={open} onOpenChange={setOpen} title="New tenant" description="Create an organization on the platform.">
        <div className="space-y-4">
          <Input label={tr("Name")} value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Traders Ltd" />
          <Input
            label={tr("Slug")}
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="acme-traders"
            hint={tr("Lowercase letters, numbers and hyphens only.")}
          />
          <Select label="Starting tier" value={tier} onValueChange={(v) => setTier(v as Tier)} options={TIER_OPTIONS} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>{tr("Cancel")}</Button>
            <Button onClick={submit} loading={saving} disabled={!name.trim() || !slug.trim()}>{tr("Create")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
