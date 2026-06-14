"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useProcurement } from "@/lib/hooks/useProcurement";
import { formatDate } from "@/lib/utils/dates";
import { formatTZS } from "@/lib/utils/currency";
import type { PurchaseOrder, POLine } from "@/types";

function MatchDot({ ok }: { ok: boolean }) {
  return ok ? <Check className="w-3 h-3 text-ud-success" /> : <X className="w-3 h-3 text-ud-text-faint" />;
}

interface LineDraft extends POLine {}

interface FormState {
  supplierId: string;
  date: string;
  expectedDelivery: string;
  lines: LineDraft[];
}

function emptyForm(supplierId: string): FormState {
  const today = new Date().toISOString().split("T")[0]!;
  const future = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]!;
  return {
    supplierId,
    date: today,
    expectedDelivery: future,
    lines: [{ id: "1", description: "", quantity: 1, unitPrice: 0, lineTotal: 0 }],
  };
}

export default function PurchaseOrdersPage() {
  const { purchaseOrders, suppliers, createPurchaseOrder, updatePOMatch, loading: procLoading } = useProcurement();
  const loading = procLoading;

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm(suppliers[0]?.id ?? ""));
  const [matchEdit, setMatchEdit] = useState<PurchaseOrder | null>(null);

  const subtotal = form.lines.reduce((s, l) => s + l.lineTotal, 0);
  const vat = Math.round(subtotal * 0.18);
  const total = subtotal + vat;

  function openAdd() {
    setForm(emptyForm(suppliers[0]?.id ?? ""));
    setAddOpen(true);
  }

  function updateLine(id: string, patch: Partial<LineDraft>) {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, ...patch };
        updated.lineTotal = updated.quantity * updated.unitPrice;
        return updated;
      }),
    }));
  }

  function addLine() {
    setForm((prev) => ({
      ...prev,
      lines: [...prev.lines, { id: String(Date.now()), description: "", quantity: 1, unitPrice: 0, lineTotal: 0 }],
    }));
  }

  function removeLine(id: string) {
    setForm((prev) => ({ ...prev, lines: prev.lines.filter((l) => l.id !== id) }));
  }

  async function save() {
    const supplier = suppliers.find((s) => s.id === form.supplierId);
    if (!supplier) {
      toast.error("Pick a supplier");
      return;
    }
    if (form.lines.every((l) => l.lineTotal === 0)) {
      toast.error("Add at least one line");
      return;
    }
    const res = await createPurchaseOrder({
      supplierId: supplier.id,
      supplierName: supplier.name,
      date: form.date,
      expectedDelivery: form.expectedDelivery,
      lines: form.lines.map((l) => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice })),
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`PO ${res.data.number} created`);
    setAddOpen(false);
  }

  const COLS: Column<PurchaseOrder>[] = [
    { key: "number",       label: "PO #",      sortable: true, className: "font-mono text-xs" },
    { key: "supplierName", label: "Supplier",  sortable: true, render: (r) => <span className="font-medium">{r.supplierName}</span> },
    { key: "date",         label: "Date",      sortable: true, render: (r) => formatDate(r.date) },
    { key: "expectedDelivery", label: "Delivery", render: (r) => formatDate(r.expectedDelivery) },
    { key: "total",        label: "Total",     sortable: true, align: "right", render: (r) => <CurrencyDisplay amount={r.total} showSymbol={false} className="font-medium" /> },
    { key: "matchStatus",  label: "3-way match", render: (r) => (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs"><MatchDot ok={r.matchStatus.poConfirmed} />PO</span>
        <span className="inline-flex items-center gap-1 text-xs"><MatchDot ok={r.matchStatus.grnReceived} />GRN</span>
        <span className="inline-flex items-center gap-1 text-xs"><MatchDot ok={r.matchStatus.invoiceReceived} />INV</span>
      </div>
    ) },
    { key: "status", label: "Status", render: (r) => (
      <Badge variant={r.status === "Received" ? "success" : r.status === "Sent" ? "info" : r.status === "Draft" ? "warning" : "default"}>{r.status}</Badge>
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Purchase Orders"
        subtitle={`${purchaseOrders.length} POs · 3-way matched against GRN and supplier invoices`}
        breadcrumbs={[{ label: "Procurement", href: "/procurement" }, { label: "Purchase Orders" }]}
        actions={<Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openAdd}>Create PO</Button>}
      />
      {loading ? <TableSkeleton rows={10} columns={7} /> :
        <DataTable
          data={purchaseOrders}
          columns={COLS}
          pageSize={15}
          initialSortKey="date"
          initialSortDir="desc"
          rowKey={(r) => r.id}
          onRowClick={(r) => setMatchEdit(r)}
        />
      }

      {/* Create PO modal */}
      <Modal
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Create purchase order"
        description="Raise a new PO. After supplier confirmation, mark GRN received and supplier invoice received."
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => void save()}>Create PO</Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select label="Supplier" value={form.supplierId} onValueChange={(v) => setForm({ ...form, supplierId: v })} options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
            <Input  label="Date"              type="date" value={form.date}             onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Input  label="Expected delivery" type="date" value={form.expectedDelivery} onChange={(e) => setForm({ ...form, expectedDelivery: e.target.value })} />
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
                  <div className="sm:col-span-6"><Input value={l.description} onChange={(e) => updateLine(l.id, { description: e.target.value })} placeholder="Description" /></div>
                  <div className="sm:col-span-2"><Input type="number" value={l.quantity || ""}  onChange={(e) => updateLine(l.id, { quantity:  Number(e.target.value) || 0 })} placeholder="Qty" className="text-right" /></div>
                  <div className="sm:col-span-2"><Input type="number" value={l.unitPrice || ""} onChange={(e) => updateLine(l.id, { unitPrice: Number(e.target.value) || 0 })} placeholder="Unit Price" className="text-right font-mono" /></div>
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

          <div className="ml-auto w-full sm:w-64 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-ud-text-muted">Subtotal</span><span className="font-mono">{subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-ud-text-muted">VAT (18%)</span><span className="font-mono">{vat.toLocaleString()}</span></div>
            <div className="flex justify-between font-bold pt-2 border-t border-ud-border"><span>Total (TZS)</span><span className="font-mono">{total.toLocaleString()}</span></div>
          </div>
        </div>
      </Modal>

      {/* 3-way match modal */}
      <Modal
        open={matchEdit !== null}
        onOpenChange={(o) => !o && setMatchEdit(null)}
        title={matchEdit ? `${matchEdit.number} 3-way match` : ""}
        description="Toggle each document as it is received and verified."
        size="md"
      >
        {matchEdit && (
          <div className="space-y-2">
            {([
              { key: "poConfirmed",     label: "PO confirmed by supplier" },
              { key: "grnReceived",     label: "Goods received note (GRN) signed" },
              { key: "invoiceReceived", label: "Supplier invoice received (EFD)" },
            ] as const).map((row) => (
              <label key={row.key} className="flex items-center justify-between p-3 rounded-xl border border-ud-border hover:border-ud-primary/40 cursor-pointer transition-colors">
                <span className="text-sm font-medium">{row.label}</span>
                <input
                  type="checkbox"
                  checked={matchEdit.matchStatus[row.key]}
                  onChange={(e) => {
                    void updatePOMatch(matchEdit.id, { [row.key]: e.target.checked });
                    setMatchEdit({ ...matchEdit, matchStatus: { ...matchEdit.matchStatus, [row.key]: e.target.checked } });
                  }}
                  className="w-4 h-4"
                />
              </label>
            ))}
            <div className="text-xs text-ud-text-muted mt-2">
              Once all three are checked, the PO is fully 3-way matched and ready for payment authorisation.
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
