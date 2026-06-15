"use client";
import { useState } from "react";
import { Plus, Store, Star } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { useBranches } from "@/lib/hooks/useBranches";
import { useT } from "@/lib/hooks/useT";

interface FormState {
  name: string;
  code: string;
  region: string;
  address: string;
  phone: string;
}

function emptyForm(): FormState {
  return { name: "", code: "", region: "", address: "", phone: "" };
}

export default function BranchesSettingsPage() {
  const t = useT();
  const { branches, loading, createBranch } = useBranches();
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  async function save() {
    if (!form.name.trim()) {
      toast.error(t("Branch name is required"));
      return;
    }
    setSaving(true);
    try {
      const res = await createBranch({
        name: form.name.trim(),
        ...(form.code.trim() ? { code: form.code.trim() } : {}),
        ...(form.region.trim() ? { region: form.region.trim() } : {}),
        ...(form.address.trim() ? { address: form.address.trim() } : {}),
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("Added {name}", { name: res.data.name }));
      setAddOpen(false);
      setForm(emptyForm());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-bold text-lg">{t("Branches")}</h2>
          <p className="text-sm text-ud-text-muted">{t("Locations where you record point-of-sale transactions.")}</p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>{t("Add branch")}</Button>
      </div>

      {loading ? (
        <CardGridSkeleton count={3} cols={3} />
      ) : branches.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No branches yet"
          description="Add your first branch so point-of-sale metrics can be tracked per location."
          action={{ label: "Add branch", onClick: () => setAddOpen(true), icon: <Plus className="w-4 h-4" /> }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {branches.map((b) => (
            <div key={b.id} className="bg-white border border-ud-border rounded-2xl p-4 shadow-card">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-ud-primary-50 flex items-center justify-center">
                  <Store className="w-4 h-4 text-ud-primary" />
                </div>
                {b.isPrimary && (
                  <Badge variant="gold" size="sm"><Star className="w-3 h-3 mr-0.5 inline" />{t("Primary")}</Badge>
                )}
              </div>
              <div className="mt-3 font-medium">{b.name}</div>
              <div className="text-xs text-ud-text-muted font-mono">{b.code}</div>
              {b.region && <div className="mt-1 text-sm text-ud-text-secondary">{b.region}</div>}
              {b.phone && <div className="text-xs text-ud-text-muted">{b.phone}</div>}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add branch"
        description="Create a new branch / store location."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>{t("Cancel")}</Button>
            <Button variant="primary" loading={saving} onClick={() => void save()}>{t("Add branch")}</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Input label={t("Branch name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label={t("Code (auto if blank)")} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <Input label={t("Region")} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          <Input label={t("Phone")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+255 712 345 678" />
          <div className="sm:col-span-2">
            <Input label={t("Address")} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
