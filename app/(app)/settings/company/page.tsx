"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Building2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FileUpload } from "@/components/ui/FileUpload";
import { useCompany } from "@/lib/hooks/useCompany";
import type { UpdateCompanyInput } from "@/lib/server/schemas/company";
import toast from "react-hot-toast";

type FormState = UpdateCompanyInput;

export default function CompanySettingsPage() {
  const { company, loading, save, refresh } = useCompany();
  const [form, setForm] = useState<FormState>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name,
        shortName: company.shortName,
        regNumber: company.regNumber,
        tin: company.tin,
        vatNumber: company.vatNumber,
        efdSerial: company.efdSerial,
        nbaaNumber: company.nbaaNumber,
        address: company.address,
        email: company.email,
        phone: company.phone,
      });
    }
  }, [company]);

  function update(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setDirty(true);
  }

  async function onSave() {
    setSaving(true);
    try {
      const r = await save(form);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setDirty(false);
      toast.success("Company settings saved");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-ud-border rounded-2xl p-6 shadow-card">
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-5 px-4 py-3 rounded-xl bg-ud-warning-bg border border-ud-warning/20 flex items-center justify-between"
          >
            <div className="text-sm text-ud-warning">You have unsaved changes</div>
            <Button variant="primary" size="sm" loading={saving} onClick={() => void onSave()} icon={<Save className="w-3.5 h-3.5" />}>Save changes</Button>
          </motion.div>
        )}
      </AnimatePresence>

      <h2 className="font-display font-bold text-lg mb-1">Company profile</h2>
      <p className="text-sm text-ud-text-muted mb-5">These details appear on invoices, statements, and TRA filings.</p>

      <div className="mb-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl border border-ud-border bg-ud-surface-2 flex items-center justify-center overflow-hidden">
          {company?.logoUrl ? (
            <Image src={company.logoUrl} alt="Company logo" width={64} height={64} className="w-16 h-16 object-contain" />
          ) : (
            <Building2 className="w-6 h-6 text-ud-text-faint" />
          )}
        </div>
        <div>
          <div className="text-sm font-medium mb-1">Company logo</div>
          <FileUpload
            purpose="logo"
            accept="image/*"
            label={company?.logoUrl ? "Replace logo" : "Upload logo"}
            onUploaded={() => void refresh()}
          />
        </div>
      </div>

      {loading && !company ? (
        <p className="text-sm text-ud-text-muted">Loading company profile…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input label="Company name" value={form.name ?? ""} onChange={(e) => update("name", e.target.value)} />
          </div>
          <Input label="Short name" value={form.shortName ?? ""} onChange={(e) => update("shortName", e.target.value)} />
          <Input label="Registration #" value={form.regNumber ?? ""} onChange={(e) => update("regNumber", e.target.value)} />
          <Input label="TIN" value={form.tin ?? ""} onChange={(e) => update("tin", e.target.value)} hint="Format: ###-###-###" />
          <Input label="VAT Number" value={form.vatNumber ?? ""} onChange={(e) => update("vatNumber", e.target.value)} />
          <Input label="EFD Serial" value={form.efdSerial ?? ""} onChange={(e) => update("efdSerial", e.target.value)} />
          <Input label="NBAA Number" value={form.nbaaNumber ?? ""} onChange={(e) => update("nbaaNumber", e.target.value)} />
          <div className="md:col-span-2">
            <Input label="Address" value={form.address ?? ""} onChange={(e) => update("address", e.target.value)} />
          </div>
          <Input label="Email" type="email" value={form.email ?? ""} onChange={(e) => update("email", e.target.value)} />
          <Input label="Phone" value={form.phone ?? ""} onChange={(e) => update("phone", e.target.value)} />
        </div>
      )}
    </div>
  );
}
