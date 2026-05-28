"use client";
import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Save, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { COMPANY } from "@/lib/mock-data/company";
import { useDataStore } from "@/lib/store/dataStore";
import { formatTZS } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import { efdFormat } from "@/lib/mock-data/generators";
import toast from "react-hot-toast";
import type { InvoiceLine, Invoice } from "@/types";

type LineDraft = InvoiceLine;

function computeDueDate(issued: string): string {
  const d = new Date(issued);
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0]!;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { customers, addInvoice } = useDataStore();
  const today = new Date().toISOString().split("T")[0]!;
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(computeDueDate(today));
  const [lines, setLines] = useState<LineDraft[]>([
    { id: "1", description: "", quantity: 1, unitPrice: 0, discountPct: 0, vatPct: 18, lineTotal: 0 },
  ]);

  const customer = customers.find((c) => c.id === customerId);

  function updateLine(id: string, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l) => {
      if (l.id !== id) return l;
      const updated = { ...l, ...patch };
      const subtotal = updated.quantity * updated.unitPrice;
      updated.lineTotal = subtotal - subtotal * (updated.discountPct / 100);
      return updated;
    }));
  }

  function addLine() {
    setLines((prev) => [...prev, { id: String(Date.now()), description: "", quantity: 1, unitPrice: 0, discountPct: 0, vatPct: 18, lineTotal: 0 }]);
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const vat = Math.round(subtotal * 0.18);
  const total = subtotal + vat;

  function save(status: "Draft" | "Sent") {
    if (!customer) return;
    const inv: Invoice = {
      id: `inv_new_${Date.now()}`,
      number: `INV-2024-${String(Math.floor(Math.random() * 90000) + 10000)}`,
      customerId: customer.id,
      customerName: customer.name,
      issueDate,
      dueDate,
      lines,
      subtotal,
      discount: 0,
      vatAmount: vat,
      total,
      status,
      efdNumber: efdFormat(Date.now() % 99999999),
      notes: "Payment is due 30 days from invoice date. Bank: CRDB 0150123456789",
    };
    addInvoice(inv);
    toast.success(status === "Sent" ? "Invoice sent" : "Invoice saved as draft");
    router.push("/sales/invoices");
  }

  return (
    <PageWrapper>
      <PageHeader
        title="New Invoice"
        subtitle="Live preview updates as you type"
        breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "New Invoice" }]}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-4">
          <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card">
            <h3 className="font-display font-bold mb-4">Invoice details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Customer"
                value={customerId}
                onValueChange={setCustomerId}
                options={customers.map((c) => ({ value: c.id, label: c.name }))}
              />
              <Input label="Issue date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              <Input label="Due date"   type="date" value={dueDate}   onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card">
            <h3 className="font-display font-bold mb-3">Line items</h3>
            <div className="space-y-2.5">
              <AnimatePresence>
                {lines.map((l) => (
                  <motion.div
                    key={l.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-2 sm:grid sm:grid-cols-12 sm:gap-2 items-stretch sm:items-start p-2.5 rounded-xl bg-ud-surface-2"
                  >
                    <div className="sm:col-span-5"><Input value={l.description} onChange={(e) => updateLine(l.id, { description: e.target.value })} placeholder="Description" /></div>
                    <div className="sm:col-span-2"><Input type="number" value={l.quantity || ""}  onChange={(e) => updateLine(l.id, { quantity:  Number(e.target.value) || 0 })} placeholder="Qty" className="text-right" /></div>
                    <div className="sm:col-span-3"><Input type="number" value={l.unitPrice || ""} onChange={(e) => updateLine(l.id, { unitPrice: Number(e.target.value) || 0 })} placeholder="Unit Price" className="text-right font-mono" /></div>
                    <div className="sm:col-span-2 flex items-center gap-1">
                      <span className="font-mono text-sm tabular-nums">{formatTZS(l.lineTotal, true).replace("TSh ", "")}</span>
                      {lines.length > 1 && (
                        <button onClick={() => setLines((p) => p.filter((x) => x.id !== l.id))} className="ml-auto p-1.5 rounded-lg hover:bg-ud-danger-bg text-ud-danger" aria-label="Remove">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <button onClick={addLine} className="mt-3 inline-flex items-center gap-1.5 text-sm text-ud-primary font-medium hover:underline">
              <Plus className="w-3.5 h-3.5" />Add line
            </button>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => save("Draft")} icon={<Save className="w-4 h-4" />}>Save draft</Button>
            <Button variant="primary" onClick={() => save("Sent")}  icon={<Send className="w-4 h-4" />}>Save & send</Button>
          </div>
        </div>

        {/* Live preview */}
        <div className="bg-white border border-ud-border rounded-2xl p-8 shadow-card aspect-[1/1.4] overflow-auto">
          <div className="flex justify-between mb-8">
            <div>
              <Image
                src="/images/uhasibu-digito-circle.png"
                alt="Uhasibu Digito"
                width={48}
                height={48}
                className="w-12 h-12 rounded-xl mb-2"
              />
              <div className="font-display font-bold">{COMPANY.shortName}</div>
              <div className="text-xs text-ud-text-muted">{COMPANY.address}</div>
              <div className="text-xs text-ud-text-muted">TIN: {COMPANY.tin} · VAT: {COMPANY.vatNumber}</div>
            </div>
            <div className="text-right">
              <h1 className="font-display font-extrabold text-3xl text-ud-primary">INVOICE</h1>
              <div className="text-xs text-ud-text-muted mt-1">PREVIEW</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
            <div>
              <div className="uppercase tracking-[0.08em] text-ud-text-muted mb-1">Bill to</div>
              <div className="font-medium">{customer?.name}</div>
              <div className="text-ud-text-muted">{customer?.address}</div>
              <div className="text-ud-text-muted">TIN: {customer?.tin}</div>
            </div>
            <div className="text-right">
              <div className="uppercase tracking-[0.08em] text-ud-text-muted mb-1">Details</div>
              <div>Issued: {formatDate(issueDate)}</div>
              <div>Due: {formatDate(dueDate)}</div>
            </div>
          </div>

          <table className="w-full text-xs mb-6">
            <thead className="bg-ud-surface-2">
              <tr>
                <th className="text-left px-2.5 py-2 uppercase tracking-[0.06em]">Description</th>
                <th className="text-right px-2.5 py-2 uppercase tracking-[0.06em]">Qty</th>
                <th className="text-right px-2.5 py-2 uppercase tracking-[0.06em]">Unit</th>
                <th className="text-right px-2.5 py-2 uppercase tracking-[0.06em]">Total</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} className="border-b border-ud-border">
                  <td className="px-2.5 py-2">{l.description || <span className="text-ud-text-faint">—</span>}</td>
                  <td className="px-2.5 py-2 text-right font-mono">{l.quantity}</td>
                  <td className="px-2.5 py-2 text-right font-mono">{l.unitPrice.toLocaleString()}</td>
                  <td className="px-2.5 py-2 text-right font-mono font-medium">{l.lineTotal.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto w-64 text-xs space-y-1.5">
            <div className="flex justify-between"><span className="text-ud-text-muted">Subtotal</span><span className="font-mono">{subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-ud-text-muted">VAT (18%)</span><span className="font-mono">{vat.toLocaleString()}</span></div>
            <div className="flex justify-between font-bold pt-2 border-t border-ud-border"><span>Total (TZS)</span><span className="font-mono">{total.toLocaleString()}</span></div>
          </div>

          <div className="mt-6 pt-4 border-t border-ud-border text-[10px] text-ud-text-muted">
            <div className="font-medium text-ud-text-secondary mb-1">Payment</div>
            <div>Bank: CRDB 0150-1234-5678-9 · Kilimanjaro Trading Co. Ltd</div>
            <div>EFD will be issued on payment. Thank you for your business.</div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
