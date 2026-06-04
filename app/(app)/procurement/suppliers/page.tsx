"use client";
import { useState } from "react";
import { Plus, Star } from "lucide-react";
import toast from "react-hot-toast";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useLoadingSimulation } from "@/lib/hooks/useLoadingSimulation";
import { useDataStore } from "@/lib/store/dataStore";
import type { Supplier } from "@/types";

interface FormState {
  name: string;
  contactPerson: string;
  tin: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  paymentTerms: string;
  creditLimit: number;
  bankName: string;
  bankAccount: string;
  performanceRating: number;
}

function emptyForm(): FormState {
  return {
    name: "", contactPerson: "", tin: "", phone: "+255 ", email: "",
    city: "Dar es Salaam", address: "", paymentTerms: "Net 30", creditLimit: 5_000_000,
    bankName: "CRDB Bank", bankAccount: "", performanceRating: 4,
  };
}

export default function SuppliersPage() {
  const loading = useLoadingSimulation(800);
  const suppliers = useDataStore((s) => s.suppliers);
  const addSupplier = useDataStore((s) => s.addSupplier);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  function save() {
    if (!form.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    const supplier: Supplier = {
      id: `sup_${Date.now()}`,
      name: form.name.trim(),
      contactPerson: form.contactPerson,
      tin: form.tin || "000-000-000",
      phone: form.phone,
      email: form.email,
      city: form.city,
      address: form.address,
      paymentTerms: form.paymentTerms,
      outstandingBalance: 0,
      creditLimit: form.creditLimit,
      performanceRating: form.performanceRating,
      bankName: form.bankName,
      bankAccount: form.bankAccount,
    };
    addSupplier(supplier);
    toast.success(`Added ${supplier.name}`);
    setAddOpen(false);
    setForm(emptyForm());
  }

  const COLS: Column<Supplier>[] = [
    { key: "name", label: "Supplier", sortable: true, render: (r) => <div><div className="font-medium">{r.name}</div><div className="text-xs text-ud-text-muted">{r.contactPerson}</div></div> },
    { key: "city", label: "City" },
    { key: "tin",  label: "TIN", className: "font-mono text-xs" },
    { key: "paymentTerms", label: "Terms" },
    { key: "outstandingBalance", label: "Outstanding", align: "right", render: (r) => <CurrencyDisplay amount={r.outstandingBalance} compact /> },
    { key: "performanceRating", label: "Rating", align: "right", render: (r) => (
      <div className="inline-flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={`w-3 h-3 ${i < r.performanceRating ? "fill-ud-gold text-ud-gold" : "text-ud-border"}`} />
        ))}
      </div>
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Suppliers"
        subtitle={`${suppliers.length} suppliers · performance-rated`}
        breadcrumbs={[{ label: "Procurement", href: "/procurement" }, { label: "Suppliers" }]}
        actions={<Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Add supplier</Button>}
      />
      {loading ? <TableSkeleton rows={10} columns={6} /> :
        <DataTable data={suppliers} columns={COLS} pageSize={15} initialSortKey="name" rowKey={(r) => r.id} />
      }

      <Modal
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add supplier"
        description="Add a new supplier to the procurement register."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={save}>Add supplier</Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Supplier name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Contact person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
            <Input label="TIN" value={form.tin} onChange={(e) => setForm({ ...form, tin: e.target.value })} placeholder="###-###-###" />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="City"  value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Select label="Payment terms" value={form.paymentTerms} onValueChange={(v) => setForm({ ...form, paymentTerms: v })} options={[
              { value: "Cash", label: "Cash" }, { value: "Net 15", label: "Net 15" }, { value: "Net 30", label: "Net 30" }, { value: "Net 60", label: "Net 60" },
            ]} />
            <Input label="Credit limit (TZS)" type="number" value={String(form.creditLimit)} onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) || 0 })} />
            <Input label="Performance rating (1-5)" type="number" value={String(form.performanceRating)} onChange={(e) => setForm({ ...form, performanceRating: Math.min(5, Math.max(1, Number(e.target.value) || 1)) })} />
            <Input label="Bank" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
            <Input label="Bank account #" value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} />
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
