"use client";
import { useState, useMemo } from "react";
import { Plus, Mail, Phone, MapPin } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { FilterBar } from "@/components/ui/FilterBar";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { useLoadingSimulation } from "@/lib/hooks/useLoadingSimulation";
import { useDataStore } from "@/lib/store/dataStore";
import type { Customer } from "@/types";

export default function CustomersPage() {
  const loading = useLoadingSimulation(800);
  const { customers } = useDataStore();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);

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
        actions={<Button variant="primary" icon={<Plus className="w-4 h-4" />}>Add customer</Button>}
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

      <Modal open={selected !== null} onOpenChange={(o) => !o && setSelected(null)} title={selected?.name ?? ""} description={selected?.contactPerson} size="lg">
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-ud-text-muted" />{selected.email}</div>
              <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-ud-text-muted" />{selected.phone}</div>
              <div className="flex items-center gap-2 col-span-2"><MapPin className="w-3.5 h-3.5 text-ud-text-muted" />{selected.address}</div>
            </div>
            <div className="divider-hairline" />
            <div className="grid grid-cols-3 gap-3 text-sm">
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
