"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { COMPANY } from "@/lib/mock-data/company";
import toast from "react-hot-toast";

export default function CompanySettingsPage() {
  const [form, setForm] = useState(COMPANY);
  const [dirty, setDirty] = useState(false);

  function update(field: keyof typeof COMPANY, value: string) {
    setForm({ ...form, [field]: value });
    setDirty(true);
  }

  function save() {
    setDirty(false);
    toast.success("Company settings saved");
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
            <Button variant="primary" size="sm" onClick={save} icon={<Save className="w-3.5 h-3.5" />}>Save changes</Button>
          </motion.div>
        )}
      </AnimatePresence>

      <h2 className="font-display font-bold text-lg mb-1">Company profile</h2>
      <p className="text-sm text-ud-text-muted mb-5">These details appear on invoices, statements, and TRA filings.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Input label="Company name" value={form.name} onChange={(e) => update("name", e.target.value)} />
        </div>
        <Input label="Short name" value={form.shortName} onChange={(e) => update("shortName", e.target.value)} />
        <Input label="Registration #" value={form.regNumber} onChange={(e) => update("regNumber", e.target.value)} />
        <Input label="TIN" value={form.tin} onChange={(e) => update("tin", e.target.value)} hint="Format: ###-###-###" />
        <Input label="VAT Number" value={form.vatNumber} onChange={(e) => update("vatNumber", e.target.value)} />
        <Input label="EFD Serial" value={form.efdSerial} onChange={(e) => update("efdSerial", e.target.value)} />
        <Input label="NBAA Number" value={form.nbaaNumber} onChange={(e) => update("nbaaNumber", e.target.value)} />
        <div className="md:col-span-2">
          <Input label="Address" value={form.address} onChange={(e) => update("address", e.target.value)} />
        </div>
        <Input label="Email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
        <Input label="Phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
      </div>
    </div>
  );
}
