"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Repeat, Play, Pause, Zap, Trash2, Pencil } from "lucide-react";
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
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { useRecurringInvoices } from "@/lib/hooks/useRecurringInvoices";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useT } from "@/lib/hooks/useT";
import { formatDate } from "@/lib/utils/dates";
import { formatTZS } from "@/lib/utils/currency";
import type { RecurringInvoice, RecurringFrequency, InvoiceLine } from "@/types";

interface LineDraft extends InvoiceLine {}

interface FormState {
  customerId: string;
  frequency: RecurringFrequency;
  interval: number;
  startDate: string;
  endDate: string;
  notes: string;
  lines: LineDraft[];
}

const FREQ_UNIT: Record<RecurringFrequency, string> = { Weekly: "week", Monthly: "month", Quarterly: "quarter", Yearly: "year" };

function scheduleLabel(r: RecurringInvoice): string {
  const unit = FREQ_UNIT[r.frequency];
  return r.interval === 1 ? `Every ${unit}` : `Every ${r.interval} ${unit}s`;
}

function estimatedTotal(lines: { lineTotal: number; vatPct: number }[]): number {
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const vat = lines.reduce((s, l) => s + l.lineTotal * (l.vatPct / 100), 0);
  return subtotal + vat;
}

function emptyForm(customerId: string): FormState {
  const today = new Date().toISOString().split("T")[0]!;
  return {
    customerId,
    frequency: "Monthly",
    interval: 1,
    startDate: today,
    endDate: "",
    notes: "",
    lines: [{ id: "1", description: "", quantity: 1, unitPrice: 0, discountPct: 0, vatPct: 18, lineTotal: 0 }],
  };
}

export default function RecurringInvoicesPage() {
  const t = useT();
  const { customers } = useCustomers();
  const { recurring, loading, createRecurring, updateRecurring, deleteRecurring, generateNow } = useRecurringInvoices();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RecurringInvoice | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(customers[0]?.id ?? ""));

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(customers[0]?.id ?? ""));
    setOpen(true);
  }

  function openEdit(r: RecurringInvoice) {
    setEditingId(r.id);
    setForm({
      customerId: r.customerId,
      frequency: r.frequency,
      interval: r.interval,
      startDate: r.startDate,
      endDate: r.endDate ?? "",
      notes: r.notes,
      lines: r.lines.map((l) => ({ ...l })),
    });
    setOpen(true);
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
    setForm((prev) => ({ ...prev, lines: [...prev.lines, { id: String(Date.now()), description: "", quantity: 1, unitPrice: 0, discountPct: 0, vatPct: 18, lineTotal: 0 }] }));
  }
  function removeLine(id: string) {
    setForm((prev) => ({ ...prev, lines: prev.lines.filter((l) => l.id !== id) }));
  }

  async function save() {
    const customer = customers.find((c) => c.id === form.customerId);
    if (!customer) return toast.error(t("Pick a customer"));
    if (form.lines.every((l) => l.lineTotal === 0)) return toast.error(t("Add at least one line item with a value"));
    setSaving(true);
    try {
      const lines = form.lines.map((l) => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, discountPct: l.discountPct, vatPct: l.vatPct }));
      const res = editingId
        ? await updateRecurring({ id: editingId, customerId: form.customerId, frequency: form.frequency, interval: form.interval, startDate: form.startDate, endDate: form.endDate ? form.endDate : null, notes: form.notes, lines })
        : await createRecurring({ customerId: form.customerId, frequency: form.frequency, interval: form.interval, startDate: form.startDate, ...(form.endDate ? { endDate: form.endDate } : {}), notes: form.notes, lines });
      if (!res.ok) return toast.error(res.error);
      toast.success(editingId ? t("Recurring schedule updated") : t("Recurring schedule created"));
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function doGenerate(r: RecurringInvoice) {
    const res = await generateNow(r.id);
    if (!res.ok) return toast.error(res.error);
    toast.success(t("Invoice generated · next run advanced"));
  }

  async function togglePause(r: RecurringInvoice) {
    const res = await updateRecurring({ id: r.id, active: !r.active });
    if (!res.ok) return toast.error(res.error);
    toast.success(r.active ? t("Schedule paused") : t("Schedule resumed"));
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const res = await deleteRecurring(deleteTarget.id);
    if (!res.ok) return toast.error(res.error);
    toast.success(t("Recurring schedule removed"));
    setDeleteTarget(null);
  }

  const subtotal = form.lines.reduce((s, l) => s + l.lineTotal, 0);
  const vat = form.lines.reduce((s, l) => s + l.lineTotal * (l.vatPct / 100), 0);
  const total = subtotal + vat;

  const cols: Column<RecurringInvoice>[] = [
    { key: "customerName", label: "Customer", sortable: true },
    { key: "schedule", label: "Schedule", render: (r) => <span className="text-ud-text-secondary">{t(scheduleLabel(r))}</span> },
    { key: "nextRunAt", label: "Next run", sortable: true, accessor: (r) => r.nextRunAt, render: (r) => formatDate(r.nextRunAt) },
    { key: "amount", label: "Amount / run", align: "right", accessor: (r) => estimatedTotal(r.lines), render: (r) => <CurrencyDisplay amount={estimatedTotal(r.lines)} showSymbol={false} className="font-medium" /> },
    { key: "status", label: "Status", render: (r) => <Badge variant={r.active ? "success" : "default"}>{r.active ? t("Active") : t("Paused")}</Badge> },
    { key: "actions", label: "", align: "right", render: (r) => (
      <div className="flex justify-end gap-1">
        <button onClick={(e) => { e.stopPropagation(); void doGenerate(r); }} disabled={!r.active}
          className="p-1.5 rounded-lg hover:bg-ud-primary-50 text-ud-text-muted hover:text-ud-primary disabled:opacity-40 disabled:hover:bg-transparent" aria-label={t("Generate now")} title={t("Generate now")}>
          <Zap className="w-3.5 h-3.5" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); void togglePause(r); }}
          className="p-1.5 rounded-lg hover:bg-ud-info-bg text-ud-text-muted hover:text-ud-info" aria-label={r.active ? t("Pause") : t("Resume")} title={r.active ? t("Pause") : t("Resume")}>
          {r.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <button onClick={(e) => { e.stopPropagation(); openEdit(r); }}
          className="p-1.5 rounded-lg hover:bg-ud-surface-3 text-ud-text-muted hover:text-ud-text-primary" aria-label={t("Edit")} title={t("Edit")}>
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}
          className="p-1.5 rounded-lg hover:bg-ud-danger/10 text-ud-text-muted hover:text-ud-danger" aria-label={t("Delete")} title={t("Delete")}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Recurring invoices"
        subtitle="Schedule invoices that issue automatically — or generate any of them on demand"
        breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Recurring" }]}
        actions={<Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>{t("New schedule")}</Button>}
      />

      {loading ? <TableSkeleton rows={8} columns={6} /> :
        recurring.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="No recurring invoices yet"
            description="Create a schedule to bill a customer automatically every week, month, quarter or year. Each run posts a real invoice to the ledger."
            action={{ label: "New schedule", onClick: openCreate, icon: <Plus className="w-4 h-4" /> }}
          />
        ) : (
          <DataTable data={recurring} columns={cols} pageSize={10} initialSortKey="nextRunAt" initialSortDir="asc" rowKey={(r) => r.id} />
        )
      }

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={editingId ? "Edit recurring schedule" : "New recurring schedule"}
        description={t("Invoices issue on the next-run date (and each interval after), posting to the ledger automatically.")}
        size="xl"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>{t("Cancel")}</Button><Button variant="primary" loading={saving} onClick={() => void save()}>{editingId ? t("Save changes") : t("Create schedule")}</Button></>}
      >
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label={t("Customer")} value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })} options={customers.map((c) => ({ value: c.id, label: c.name }))} />
            <div className="grid grid-cols-2 gap-3">
              <Select label={t("Frequency")} value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v as RecurringFrequency })}
                options={[{ value: "Weekly", label: "Weekly" }, { value: "Monthly", label: "Monthly" }, { value: "Quarterly", label: "Quarterly" }, { value: "Yearly", label: "Yearly" }]} />
              <Input label={t("Every N")} type="number" value={String(form.interval)} onChange={(e) => setForm({ ...form, interval: Math.max(1, Number(e.target.value) || 1) })} />
            </div>
            <Input label={t("First run / start date")} type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <Input label={t("End date (optional)")} type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.08em] font-semibold text-ud-text-muted">{t("Line items")}</div>
            <AnimatePresence>
              {form.lines.map((l) => (
                <motion.div key={l.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex flex-col gap-2 sm:grid sm:grid-cols-12 sm:gap-2 p-2.5 rounded-xl bg-ud-surface-2">
                  <div className="sm:col-span-5"><Input value={l.description} onChange={(e) => updateLine(l.id, { description: e.target.value })} placeholder={t("Description")} /></div>
                  <div className="sm:col-span-2"><Input type="number" value={l.quantity || ""} onChange={(e) => updateLine(l.id, { quantity: Number(e.target.value) || 0 })} placeholder={t("Qty")} className="text-right" /></div>
                  <div className="sm:col-span-3"><Input type="number" value={l.unitPrice || ""} onChange={(e) => updateLine(l.id, { unitPrice: Number(e.target.value) || 0 })} placeholder={t("Unit Price")} className="text-right font-mono" /></div>
                  <div className="sm:col-span-2 flex items-center gap-1">
                    <span className="font-mono text-sm tabular-nums">{formatTZS(l.lineTotal).replace("TSh ", "")}</span>
                    {form.lines.length > 1 && (
                      <button onClick={() => removeLine(l.id)} className="ml-auto p-1.5 rounded-lg hover:bg-ud-danger-bg text-ud-danger" aria-label={t("Remove")}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <button onClick={addLine} className="inline-flex items-center gap-1.5 text-sm text-ud-primary font-medium hover:underline">
              <Plus className="w-3.5 h-3.5" />{t("Add line")}
            </button>
          </div>

          <Input label={t("Notes")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t("Optional — appears on each issued invoice")} />

          <div className="ml-auto w-full sm:w-64 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-ud-text-muted">{t("Subtotal")}</span><span className="font-mono">{subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-ud-text-muted">{t("VAT")}</span><span className="font-mono">{Math.round(vat).toLocaleString()}</span></div>
            <div className="flex justify-between font-bold pt-2 border-t border-ud-border"><span>{t("Total per invoice (TZS)")}</span><span className="font-mono">{Math.round(total).toLocaleString()}</span></div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t("Delete recurring schedule?")}
        message={t("This stops future automatic invoices. Invoices already issued are not affected.")}
        confirmLabel={t("Delete")}
        onConfirm={() => void confirmDelete()}
      />
    </PageWrapper>
  );
}
