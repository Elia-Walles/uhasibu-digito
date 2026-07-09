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
import { useProcurement } from "@/lib/hooks/useProcurement";
import { useT } from "@/lib/hooks/useT";
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
  const t = useT();
  const { suppliers, createSupplier, recordSupplierPayment, loading: procLoading } = useProcurement();
  const loading = procLoading;
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [payTarget, setPayTarget] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("Bank Transfer");
  const [paying, setPaying] = useState(false);

  function openPay(s: Supplier) {
    setPayTarget(s);
    setPayAmount(s.outstandingBalance);
    setPayMethod("Bank Transfer");
  }
  async function pay() {
    if (!payTarget || payAmount <= 0) return toast.error(t("Enter a payment amount"));
    setPaying(true);
    try {
      const res = await recordSupplierPayment({ supplierId: payTarget.id, amount: payAmount, method: payMethod });
      if (!res.ok) return toast.error(res.error);
      toast.success(t("Payment posted to ledger"));
      setPayTarget(null);
    } finally {
      setPaying(false);
    }
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error(t("Supplier name is required"));
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
    const res = await createSupplier(supplier);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t("Added {name}", { name: res.data.name }));
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
    { key: "actions", label: "", align: "right", width: "110px", render: (r) => (
      r.outstandingBalance > 0
        ? <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openPay(r); }}>{t("Record payment")}</Button>
        : null
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Suppliers"
        subtitle={`${suppliers.length} suppliers · performance-rated`}
        breadcrumbs={[{ label: "Procurement", href: "/procurement" }, { label: "Suppliers" }]}
        actions={<Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>{t("Add supplier")}</Button>}
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
            <Button variant="ghost" onClick={() => setAddOpen(false)}>{t("Cancel")}</Button>
            <Button variant="primary" onClick={() => void save()}>{t("Add supplier")}</Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label={t("Supplier name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label={t("Contact person")} value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
            <Input label="TIN" value={form.tin} onChange={(e) => setForm({ ...form, tin: e.target.value })} placeholder="###-###-###" />
            <Input label={t("Phone")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label={t("Email")} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label={t("City")}  value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input label={t("Address")} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Select label={t("Payment terms")} value={form.paymentTerms} onValueChange={(v) => setForm({ ...form, paymentTerms: v })} options={[
              { value: "Cash", label: "Cash" }, { value: "Net 15", label: "Net 15" }, { value: "Net 30", label: "Net 30" }, { value: "Net 60", label: "Net 60" },
            ]} />
            <Input label={t("Credit limit (TZS)")} type="number" value={String(form.creditLimit)} onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) || 0 })} />
            <Input label={t("Performance rating (1-5)")} type="number" value={String(form.performanceRating)} onChange={(e) => setForm({ ...form, performanceRating: Math.min(5, Math.max(1, Number(e.target.value) || 1)) })} />
            <Input label={t("Bank")} value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
            <Input label={t("Bank account #")} value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} />
          </div>
        </div>
      </Modal>

      <Modal
        open={payTarget !== null}
        onOpenChange={(o) => !o && setPayTarget(null)}
        title="Record supplier payment"
        description={payTarget ? t("Posts Dr Trade Payables, Cr cash/bank for {name}.", { name: payTarget.name }) : ""}
        size="sm"
        footer={<><Button variant="ghost" onClick={() => setPayTarget(null)}>{t("Cancel")}</Button><Button variant="primary" loading={paying} onClick={() => void pay()}>{t("Record payment")}</Button></>}
      >
        {payTarget && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-ud-text-muted">{t("Outstanding")}</span>
              <CurrencyDisplay amount={payTarget.outstandingBalance} className="font-medium" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label={t("Amount")} type="number" value={String(payAmount)} onChange={(e) => setPayAmount(Number(e.target.value) || 0)} className="text-right font-mono" />
              <Select label={t("Method")} value={payMethod} onValueChange={setPayMethod}
                options={["Bank Transfer", "M-Pesa", "Cash", "Cheque"].map((m) => ({ value: m, label: m }))} />
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
