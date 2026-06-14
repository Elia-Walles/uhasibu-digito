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
import type { Tier } from "@/lib/auth/tiers";
import type { AdminTenantRow } from "@/lib/server/actions/admin/types";

const TIER_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "starter", label: "Starter" },
  { value: "business", label: "Business" },
  { value: "enterprise", label: "Enterprise" },
];

export default function AdminTenantsPage() {
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
      toast.success("Tenant created");
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
        title="Tenants"
        subtitle="Every organization on the platform."
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setOpen(true)}>
            New tenant
          </Button>
        }
      />

      <AdminPanel>
        {loading ? (
          <div className="py-14 text-center text-sm text-ud-text-muted">Loading tenants…</div>
        ) : (
          <AdminTable<AdminTenantRow>
            data={tenants}
            rowKey={(t) => t.id}
            onRowClick={(t) => router.push(`/admin/tenants/${t.id}`)}
            emptyLabel="No tenants yet."
            caption="Tenants"
            columns={[
              { key: "name", label: "Name", render: (t) => (
                <div>
                  <div className="text-ud-text-primary font-medium">{t.name}</div>
                  <div className="text-ud-text-muted text-xs">{t.slug}</div>
                </div>
              ) },
              { key: "tier", label: "Tier", render: (t) => <StatusPill value={t.tier} /> },
              { key: "userCount", label: "Users", align: "right" },
              { key: "subscriptionStatus", label: "Subscription", render: (t) =>
                t.subscriptionStatus ? <StatusPill value={t.subscriptionStatus} /> : <span className="text-ud-text-faint"></span> },
              { key: "mrrTzs", label: "MRR", align: "right", render: (t) => formatTZS(t.mrrTzs, true) },
              { key: "createdAt", label: "Joined", render: (t) => t.createdAt.slice(0, 10) },
            ]}
          />
        )}
      </AdminPanel>

      <Modal open={open} onOpenChange={setOpen} title="New tenant" description="Create an organization on the platform.">
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Traders Ltd" />
          <Input
            label="Slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="acme-traders"
            hint="Lowercase letters, numbers and hyphens only."
          />
          <Select label="Starting tier" value={tier} onValueChange={(v) => setTier(v as Tier)} options={TIER_OPTIONS} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} loading={saving} disabled={!name.trim() || !slug.trim()}>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
