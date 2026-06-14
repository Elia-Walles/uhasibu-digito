"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, FileCheck2, Send } from "lucide-react";
import toast from "react-hot-toast";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { useQuotations } from "@/lib/hooks/useQuotations";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useInvoices } from "@/lib/hooks/useInvoices";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { formatDate } from "@/lib/utils/dates";
import { formatTZS } from "@/lib/utils/currency";
import type { Quotation, InvoiceLine } from "@/types";

const STATUS_BADGE = { Draft: "warning", Sent: "info", Accepted: "success", Expired: "danger", Converted: "default" } as const;

interface LineDraft extends InvoiceLine {}

interface FormState {
  customerId: string;
  date: string;
  validUntil: string;
  notes: string;
  lines: LineDraft[];
}

function emptyForm(customerId: string): FormState {
  const today = new Date().toISOString().split("T")[0]!;
  const future = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]!;
  return {
    customerId,
    date: today,
    validUntil: future,
    notes: "",
    lines: [{ id: "1", description: "", quantity: 1, unitPrice: 0, discountPct: 0, vatPct: 18, lineTotal: 0 }],
  };
}

export default function QuotationsPage() {
  const router = useRouter();
  const { customers } = useCustomers();
  const { createInvoice } = useInvoices();
  const { quotations, createQuotation, updateQuotationStatus, loading: quotLoading } = useQuotations();
  const loading = quotLoading;

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm(customers[0]?.id ?? ""));

  const subtotal = form.lines.reduce((s, l) => s + l.lineTotal, 0);
  const vat = Math.round(subtotal * 0.18);
  const total = subtotal + vat;

  function openAdd() {
    setForm(emptyForm(customers[0]?.id ?? ""));
    setAddOpen(true);
  }

  function updateLine(id: string, patch: Partial<LineDraft>) {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, ...patch };
        const sub = updated.quantity * updated.unitPrice;
        updated.lineTotal = sub - sub * (updated.discountPct / 100);
        return updated;
      }),
    }));
  }

  function addLine() {
    setForm((prev) => ({
      ...prev,
      lines: [...prev.lines, { id: String(Date.now()), description: "", quantity: 1, unitPrice: 0, discountPct: 0, vatPct: 18, lineTotal: 0 }],
    }));
  }

  function removeLine(id: string) {
    setForm((prev) => ({ ...prev, lines: prev.lines.filter((l) => l.id !== id) }));
  }

  async function save(status: "Draft" | "Sent") {
    const customer = customers.find((c) => c.id === form.customerId);
    if (!customer) {
      toast.error("Pick a customer");
      return;
    }
    if (form.lines.every((l) => l.lineTotal === 0)) {
      toast.error("Add at least one line item with a value");
      return;
    }
    const res = await createQuotation({
      customerId: customer.id,
      customerName: customer.name,
      date: form.date,
      validUntil: form.validUntil,
      notes: form.notes,
      status,
      lines: form.lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountPct: l.discountPct,
        vatPct: l.vatPct,
      })),
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(status === "Sent" ? "Quotation sent" : "Quotation saved as draft");
    setAddOpen(false);
  }

  async function convert(q: Quotation) {
    const res = await createInvoice({
      customerId: q.customerId,
      issueDate: new Date().toISOString().split("T")[0]!,
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]!,
      notes: `Converted from quotation ${q.number}. ${q.notes ?? ""}`.trim(),
      status: "Sent",
      lines: q.lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountPct: l.discountPct,
        vatPct: l.vatPct,
      })),
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    await updateQuotationStatus(q.id, "Converted", res.data.id);
    toast.success(`Converted to ${res.data.number}`);
    router.push("/sales/invoices");
  }

  const cols: Column<Quotation>[] = [
    { key: "number",     label: "Quotation #", className: "font-mono text-xs" },
    { key: "customerName",label: "Customer",   sortable: true },
    { key: "date",       label: "Date",        sortable: true, render: (r) => formatDate(r.date) },
    { key: "validUntil", label: "Valid until", render: (r) => formatDate(r.validUntil) },
    { key: "total",      label: "Total",       sortable: true, align: "right", render: (r) => <CurrencyDisplay amount={r.total} className="font-medium" /> },
    { key: "status",     label: "Status",      render: (r) => <Badge variant={STATUS_BADGE[r.status]}>{r.status}</Badge> },
    { key: "actions",    label: "", align: "right", render: (r) => (
      <div className="flex justify-end gap-1">
        {r.status === "Draft" && (
          <button onClick={(e) => { e.stopPropagation(); updateQuotationStatus(r.id, "Sent"); toast.success("Marked sent"); }}
                  className="p-1.5 rounded-lg hover:bg-ud-info-bg text-ud-text-muted hover:text-ud-info" aria-label="Mark sent">
            <Send className="w-3.5 h-3.5" />
          </button>
        )}
        {(r.status === "Sent" || r.status === "Accepted") && (
          <button onClick={(e) => { e.stopPropagation(); void convert(r); }}
                  className="p-1.5 rounded-lg hover:bg-ud-primary-50 text-ud-text-muted hover:text-ud-primary" aria-label="Convert to invoice">
            <FileCheck2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Quotations"
        subtitle={`${quotations.length} quotations · ${quotations.filter((q) => q.status === "Accepted").length} accepted · ${quotations.filter((q) => q.status === "Converted").length} converted`}
        breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Quotations" }]}
        actions={<Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openAdd}>New quotation</Button>}
      />
      {loading ? <TableSkeleton rows={10} columns={7} /> :
        quotations.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="No quotations yet"
            description="Create your first quotation. Once accepted, you can convert it into an invoice with one click."
            action={{ label: "New quotation", onClick: openAdd }}
          />
        ) : (
          <DataTable data={quotations} columns={cols} pageSize={10} initialSortKey="date" initialSortDir="desc" rowKey={(r) => r.id} />
        )
      }

      <Modal
        open={addOpen}
        onOpenChange={setAddOpen}
        title="New quotation"
        description="Quotations can be sent to the customer and then converted to a real invoice on acceptance."
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => void save("Draft")}>Save draft</Button>
            <Button variant="primary" onClick={() => void save("Sent")} icon={<Send className="w-4 h-4" />}>Save & send</Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select label="Customer" value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })} options={customers.map((c) => ({ value: c.id, label: c.name }))} />
            <Input  label="Date"        type="date" value={form.date}        onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Input  label="Valid until" type="date" value={form.validUntil}  onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
          </div>

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.08em] font-semibold text-ud-text-muted">Line items</div>
            <AnimatePresence>
              {form.lines.map((l) => (
                <motion.div
                  key={l.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-2 sm:grid sm:grid-cols-12 sm:gap-2 p-2.5 rounded-xl bg-ud-surface-2"
                >
                  <div className="sm:col-span-5"><Input value={l.description} onChange={(e) => updateLine(l.id, { description: e.target.value })} placeholder="Description" /></div>
                  <div className="sm:col-span-2"><Input type="number" value={l.quantity || ""}  onChange={(e) => updateLine(l.id, { quantity:  Number(e.target.value) || 0 })} placeholder="Qty" className="text-right" /></div>
                  <div className="sm:col-span-3"><Input type="number" value={l.unitPrice || ""} onChange={(e) => updateLine(l.id, { unitPrice: Number(e.target.value) || 0 })} placeholder="Unit Price" className="text-right font-mono" /></div>
                  <div className="sm:col-span-2 flex items-center gap-1">
                    <span className="font-mono text-sm tabular-nums">{formatTZS(l.lineTotal, true).replace("TSh ", "")}</span>
                    {form.lines.length > 1 && (
                      <button onClick={() => removeLine(l.id)} className="ml-auto p-1.5 rounded-lg hover:bg-ud-danger-bg text-ud-danger" aria-label="Remove">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <button onClick={addLine} className="inline-flex items-center gap-1.5 text-sm text-ud-primary font-medium hover:underline">
              <Plus className="w-3.5 h-3.5" />Add line
            </button>
          </div>

          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional terms, delivery, etc." />

          <div className="ml-auto w-full sm:w-64 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-ud-text-muted">Subtotal</span><span className="font-mono">{subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-ud-text-muted">VAT (18%)</span><span className="font-mono">{vat.toLocaleString()}</span></div>
            <div className="flex justify-between font-bold pt-2 border-t border-ud-border"><span>Total (TZS)</span><span className="font-mono">{total.toLocaleString()}</span></div>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
