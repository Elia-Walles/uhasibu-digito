"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Pencil } from "lucide-react";
import { useAdminPlans } from "@/lib/hooks/admin/useAdminPlans";
import { AdminPageTitle, AdminPanel, StatusPill } from "@/components/admin/primitives";
import { AdminTable } from "@/components/admin/AdminTable";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatTZS } from "@/lib/utils/currency";
import { useT } from "@/lib/hooks/useT";
import type { AdminPlanRow } from "@/lib/server/actions/admin/types";

export default function AdminPlansPage() {
  const t = useT();
  const { plans, loading, editPlan, toggleActive } = useAdminPlans();
  const [editing, setEditing] = useState<AdminPlanRow | null>(null);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [price, setPrice] = useState("");
  const [features, setFeatures] = useState("");
  const [highlighted, setHighlighted] = useState(false);
  const [saving, setSaving] = useState(false);

  const openEdit = (p: AdminPlanRow) => {
    setEditing(p);
    setName(p.name);
    setTagline(p.tagline);
    setPrice(String(p.priceTzs));
    setFeatures(p.features.join("\n"));
    setHighlighted(p.highlighted);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const res = await editPlan({
      id: editing.id,
      name,
      tagline,
      priceTzs: Number(price),
      highlighted,
      features: features.split("\n").map((f) => f.trim()).filter(Boolean),
    });
    setSaving(false);
    if (res.ok) {
      toast.success(t("Plan updated"));
      setEditing(null);
    } else toast.error(res.error);
  };

  const onToggle = async (p: AdminPlanRow) => {
    const res = await toggleActive(p.id, !p.isActive);
    res.ok ? toast.success(p.isActive ? t("Plan deactivated") : t("Plan activated")) : toast.error(res.error);
  };

  return (
    <div>
      <AdminPageTitle title={t("Plans")} subtitle={t("Subscription packaging shown to customers.")} />
      <AdminPanel>
        {loading ? (
          <div className="py-14 text-center text-sm text-ud-text-muted">{t("Loading…")}</div>
        ) : (
          <AdminTable<AdminPlanRow>
            data={plans}
            rowKey={(p) => p.id}
            caption={t("Plans")}
            emptyLabel={t("No plans defined. Run the seed to populate default plans.")}
            columns={[
              { key: "name", label: t("Plan"), render: (p) => (
                <div>
                  <div className="text-ud-text-primary font-medium">{p.name}</div>
                  <div className="text-ud-text-muted text-xs">{p.tagline}</div>
                </div>
              ) },
              { key: "key", label: t("Key"), render: (p) => <StatusPill value={p.key} /> },
              { key: "priceTzs", label: t("Price"), align: "right", render: (p) => `${formatTZS(p.priceTzs)}/${p.interval}` },
              { key: "highlighted", label: t("Popular"), render: (p) => (p.highlighted ? <StatusPill value="business" /> : <span className="text-ud-text-faint"></span>) },
              { key: "subscriberCount", label: t("Active subs"), align: "right" },
              { key: "isActive", label: t("Status"), render: (p) => (
                <button onClick={() => onToggle(p)}>
                  <StatusPill value={p.isActive ? "active" : "canceled"} />
                </button>
              ) },
              { key: "actions", label: "", align: "right", render: (p) => (
                <button onClick={() => openEdit(p)} className="inline-flex items-center gap-1.5 text-xs text-ud-text-muted hover:text-ud-text-primary">
                  <Pencil className="w-3.5 h-3.5" /> {t("Edit")}
                </button>
              ) },
            ]}
          />
        )}
      </AdminPanel>

      <Modal open={!!editing} onOpenChange={(v) => !v && setEditing(null)} title={t("Edit {name}", { name: editing?.name ?? t("plan") })} size="lg">
        <div className="space-y-4">
          <Input label={t("Name")} value={name} onChange={(e) => setName(e.target.value)} />
          <Input label={t("Tagline")} value={tagline} onChange={(e) => setTagline(e.target.value)} />
          <Input label={t("Price (TZS)")} type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          <div>
            <label className="block text-xs font-medium tracking-[0.04em] text-ud-text-secondary mb-1.5">
              {t("Features (one per line)")}
            </label>
            <textarea
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              rows={6}
              className="w-full rounded-xl bg-white border border-ud-border px-3 py-2 text-sm outline-none focus:border-ud-primary focus:ring-2 focus:ring-ud-primary/15"
            />
          </div>
          <label className="flex items-center gap-2.5 text-sm text-ud-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={highlighted}
              onChange={(e) => setHighlighted(e.target.checked)}
              className="w-4 h-4 rounded border-ud-border text-ud-primary focus:ring-ud-primary"
            />
            {t("Mark as “Most popular” on pricing pages")}
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>{t("Cancel")}</Button>
            <Button onClick={save} loading={saving}>{t("Save")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
