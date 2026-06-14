"use client";
import { useState, useMemo } from "react";
import { Plus, Mail, Phone, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { FilterBar } from "@/components/ui/FilterBar";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { useCustomers } from "@/lib/hooks/useCustomers";
import type { Customer } from "@/types";

interface FormState {
  name: string;
  contactPerson: string;
  tin: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  creditLimit: number;
  paymentTerms: string;
  isInternational: boolean;
  country: string;
  swiftBic: string;
  beneficiaryBank: string;
  iban: string;
}

function emptyForm(): FormState {
  return {
    name: "", contactPerson: "", tin: "", phone: "+255 ", email: "",
    city: "Dar es Salaam", address: "", creditLimit: 5_000_000, paymentTerms: "Net 30",
    isInternational: false, country: "", swiftBic: "", beneficiaryBank: "", iban: "",
  };
}

export default function CustomersPage() {
  const { customers, createCustomer, loading: custLoading } = useCustomers();
  const loading = custLoading;
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  async function save() {
    if (!form.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    const customer: Customer = {
      id: `cust_${Date.now()}`,
      name: form.name.trim(),
      contactPerson: form.contactPerson,
      tin: form.tin || "000-000-000",
      phone: form.phone,
      email: form.email,
      city: form.city,
      address: form.address,
      creditLimit: form.creditLimit,
      outstandingBalance: 0,
      status: "Active",
      paymentTerms: form.paymentTerms,
      totalRevenue: 0,
      ...(form.isInternational && {
        isInternational: true,
        country: form.country,
        swiftBic: form.swiftBic,
        beneficiaryBank: form.beneficiaryBank,
        iban: form.iban,
      }),
    };
    const res = await createCustomer(customer);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Added ${res.data.name}`);
    setAddOpen(false);
    setForm(emptyForm());
  }

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.tin.includes(q) || c.city.toLowerCase().includes(q));
  }, [customers, search]);

  return (
    <PageWrapper>
      <PageHeader
        title="Customers"
        subtitle={`${filtered.length} customers`}
        breadcrumbs={[{ label: "CRM", href: "/crm" }, { label: "Customers" }]}
        actions={<Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Add customer</Button>}
      />
      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by name, TIN, city…" />

      {loading ? <CardGridSkeleton count={9} cols={3} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="text-left bg-white border border-ud-border rounded-2xl p-4 hover:border-ud-primary hover:shadow-card-hover transition-all"
            >
              <div className="flex items-start gap-3">
                <Avatar initials={c.name.slice(0, 2)} size="md" variant="gold" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-ud-text-primary truncate">{c.name}</div>
                  <div className="text-xs text-ud-text-muted truncate">{c.contactPerson} · {c.city}</div>
                  <Badge variant={c.status === "Active" ? "success" : c.status === "Blocked" ? "danger" : "default"} size="sm" className="mt-1.5">
                    {c.status}
                  </Badge>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-ud-text-muted">Revenue YTD</div>
                  <CurrencyDisplay amount={c.totalRevenue} compact className="font-bold" />
                </div>
                <div>
                  <div className="text-ud-text-muted">Outstanding</div>
                  <CurrencyDisplay amount={c.outstandingBalance} compact className="font-bold" colored />
                </div>
              </div>
              {c.outstandingBalance > 0 && (
                <div className="mt-2">
                  <ProgressBar value={(c.outstandingBalance / c.creditLimit) * 100} variant={c.outstandingBalance / c.creditLimit > 0.8 ? "danger" : "teal"} height={3} />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <Modal
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add customer"
        description="Capture a new customer for billing and credit tracking."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => void save()}>Add customer</Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Customer name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Contact person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
            <Input label="TIN" value={form.tin} onChange={(e) => setForm({ ...form, tin: e.target.value })} placeholder="###-###-###" />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Input label="Credit limit (TZS)" type="number" value={String(form.creditLimit)} onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) || 0 })} />
            <Select label="Payment terms" value={form.paymentTerms} onValueChange={(v) => setForm({ ...form, paymentTerms: v })} options={[
              { value: "Cash", label: "Cash" }, { value: "Net 15", label: "Net 15" }, { value: "Net 30", label: "Net 30" }, { value: "Net 60", label: "Net 60" },
            ]} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isInternational} onChange={(e) => setForm({ ...form, isInternational: e.target.checked })} className="w-4 h-4" />
            International customer (adds SWIFT / BIC payment block to invoices)
          </label>
          {form.isInternational && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-ud-surface-2">
              <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              <Input label="SWIFT / BIC" value={form.swiftBic} onChange={(e) => setForm({ ...form, swiftBic: e.target.value })} />
              <Input label="Beneficiary bank" value={form.beneficiaryBank} onChange={(e) => setForm({ ...form, beneficiaryBank: e.target.value })} />
              <Input label="IBAN" value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} />
            </div>
          )}
        </div>
      </Modal>

      <Modal open={selected !== null} onOpenChange={(o) => !o && setSelected(null)} title={selected?.name ?? ""} description={selected?.contactPerson} size="lg">
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-ud-text-muted" />{selected.email}</div>
              <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-ud-text-muted" />{selected.phone}</div>
              <div className="flex items-center gap-2 col-span-2"><MapPin className="w-3.5 h-3.5 text-ud-text-muted" />{selected.address}</div>
            </div>
            <div className="divider-hairline" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-ud-text-muted">TIN</div>
                <div className="font-mono font-medium">{selected.tin}</div>
              </div>
              <div>
                <div className="text-xs text-ud-text-muted">Credit limit</div>
                <CurrencyDisplay amount={selected.creditLimit} compact className="font-medium" />
              </div>
              <div>
                <div className="text-xs text-ud-text-muted">Payment terms</div>
                <div className="font-medium">{selected.paymentTerms}</div>
              </div>
            </div>
            <div className="divider-hairline" />
            <div>
              <div className="text-xs text-ud-text-muted mb-2">Credit utilization</div>
              <div className="flex items-center justify-between mb-1.5 text-sm">
                <CurrencyDisplay amount={selected.outstandingBalance} compact />
                <span className="text-ud-text-muted">/ {selected.creditLimit.toLocaleString()}</span>
              </div>
              <ProgressBar value={(selected.outstandingBalance / selected.creditLimit) * 100} variant={selected.outstandingBalance / selected.creditLimit > 0.8 ? "danger" : "teal"} />
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
