"use client";
import { useState, useMemo } from "react";
import { Plus, Trash2, Receipt } from "lucide-react";
import toast from "react-hot-toast";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatRowSkeleton } from "@/components/skeletons/StatRowSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { useExpenses } from "@/lib/hooks/useExpenses";
import { useCOA } from "@/lib/hooks/useCOA";
import { useT } from "@/lib/hooks/useT";
import { formatDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { Expense, ExpensePaymentMethod } from "@/types";

const METHOD_LABEL: Record<ExpensePaymentMethod, string> = { cash: "Cash", mpesa: "M-Pesa", bank: "Bank / Card", credit: "On credit" };

export default function ExpensesPage() {
  const t = useT();
  const { expenses, createExpense, deleteExpense, loading } = useExpenses();
  const { accounts } = useCOA();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const today = new Date().toISOString().split("T")[0]!;
  const [vatOn, setVatOn] = useState(false);
  const [form, setForm] = useState({ date: today, category: "", payee: "", description: "", amount: 0, vatAmount: 0, paymentMethod: "bank" as ExpensePaymentMethod, reference: "" });

  // VAT portion of a VAT-inclusive gross (18%): gross − gross/1.18.
  const inclusiveVat = (amt: number) => Math.round((amt - amt / 1.18) * 100) / 100;

  const expenseAccounts = useMemo(
    () => accounts.filter((a) => (a.type === "Expense" || a.type === "CostOfSales") && a.level >= 1).map((a) => ({ value: a.code, label: `${a.code} · ${a.name}` })),
    [accounts],
  );

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const thisMonth = expenses.filter((e) => new Date(e.date) >= monthStart).reduce((s, e) => s + e.amount, 0);

  function openModal() {
    setVatOn(false);
    setForm({ date: today, category: expenseAccounts[0]?.value ?? "", payee: "", description: "", amount: 0, vatAmount: 0, paymentMethod: "bank", reference: "" });
    setOpen(true);
  }

  function setAmount(amount: number) {
    setForm((f) => ({ ...f, amount, vatAmount: vatOn ? inclusiveVat(amount) : 0 }));
  }

  function toggleVat(on: boolean) {
    setVatOn(on);
    setForm((f) => ({ ...f, vatAmount: on ? inclusiveVat(f.amount) : 0 }));
  }

  async function save() {
    if (!form.category) return toast.error(t("Select an expense category"));
    if (form.amount <= 0) return toast.error(t("Enter an amount"));
    setSaving(true);
    try {
      const res = await createExpense(form);
      if (!res.ok) return toast.error(res.error);
      toast.success(t("Expense recorded · posted to ledger"));
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const res = await deleteExpense(deleteTarget.id);
    if (!res.ok) return toast.error(res.error);
    toast.success(t("Expense deleted · ledger reversed"));
    setDeleteTarget(null);
  }

  const COLS: Column<Expense>[] = [
    { key: "date", label: "Date", sortable: true, render: (r) => formatDate(r.date) },
    { key: "categoryName", label: "Category", render: (r) => <div><div className="font-medium">{r.categoryName}</div><div className="text-xs text-ud-text-muted font-mono">{r.category}</div></div> },
    { key: "payee", label: "Payee", render: (r) => r.payee || "—" },
    { key: "description", label: "Description", render: (r) => <span className="truncate max-w-[220px] inline-block">{r.description || "—"}</span> },
    { key: "paymentMethod", label: "Method", render: (r) => <Badge variant="default" size="sm">{METHOD_LABEL[r.paymentMethod]}</Badge> },
    { key: "vatAmount", label: "VAT", align: "right", accessor: (r) => r.vatAmount, render: (r) => r.vatAmount > 0 ? <CurrencyDisplay amount={r.vatAmount} showSymbol={false} className="text-ud-text-muted" /> : <span className="text-ud-text-faint">—</span> },
    { key: "amount", label: "Amount", sortable: true, align: "right", accessor: (r) => r.amount, render: (r) => <CurrencyDisplay amount={r.amount} showSymbol={false} className="font-medium" /> },
    { key: "actions", label: "", width: "48px", render: (r) => (
      <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }} aria-label={t("Delete")} title={t("Delete")}
        className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-ud-text-muted transition-colors hover:bg-ud-danger/10 hover:text-ud-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-primary")}>
        <Trash2 className="w-4 h-4" />
      </button>
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Expenses"
        subtitle="Record business expenses — each posts straight to the general ledger"
        breadcrumbs={[{ label: "Finance", href: "/general-ledger" }, { label: "Expenses" }]}
        actions={<Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openModal}>{t("Record expense")}</Button>}
      />

      {loading ? <StatRowSkeleton /> : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatCard label="Total expenses" value={total} variant="amber" prefix="TSh" format="compact" />
          <StatCard label="This month" value={thisMonth} variant="teal" prefix="TSh" format="compact" />
          <StatCard label="Entries" value={expenses.length} variant="blue" format="raw" />
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={10} columns={7} />
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses yet"
          description="Record your first expense — it posts Dr the expense account, Cr cash/bank (or payables) to the ledger."
          action={{ label: "Record expense", onClick: openModal, icon: <Plus className="w-4 h-4" /> }}
        />
      ) : (
        <DataTable data={expenses} columns={COLS} pageSize={15} initialSortKey="date" initialSortDir="desc" rowKey={(r) => r.id} />
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Record expense"
        description={t("Posts Dr the expense account, Cr cash/bank or Trade Payables.")}
        size="md"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>{t("Cancel")}</Button><Button variant="primary" loading={saving} onClick={() => void save()}>{t("Record expense")}</Button></>}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label={t("Category")} value={form.category} onValueChange={(v) => setForm({ ...form, category: v })} placeholder={t("Expense account")} options={expenseAccounts} />
            <Input label={t("Amount (TZS)")} type="number" value={String(form.amount)} onChange={(e) => setAmount(Number(e.target.value) || 0)} className="text-right font-mono" />
            <Input label={t("Payee")} value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} placeholder={t("Who was paid")} />
            <Select label={t("Paid with")} value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v as ExpensePaymentMethod })}
              options={[{ value: "bank", label: "Bank / Card" }, { value: "cash", label: "Cash" }, { value: "mpesa", label: "M-Pesa" }, { value: "credit", label: "On credit (payable)" }]} />
            <Input label={t("Date")} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Input label={t("Reference (optional)")} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder={t("Receipt / voucher no.")} />
          </div>
          <Input label={t("Description")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("What was this for?")} />
          <div className="rounded-xl border border-ud-border bg-ud-surface-2 p-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={vatOn} onChange={(e) => toggleVat(e.target.checked)}
                className="w-4 h-4 rounded border-ud-border text-ud-primary focus-visible:ring-2 focus-visible:ring-ud-primary" />
              <span className="text-sm font-medium text-ud-text-secondary">{t("Amount includes 18% VAT (recoverable input VAT)")}</span>
            </label>
            {vatOn && (
              <div className="mt-3 flex items-center gap-3">
                <Input label={t("VAT amount (TZS)")} type="number" value={String(form.vatAmount)} onChange={(e) => setForm({ ...form, vatAmount: Number(e.target.value) || 0 })} className="text-right font-mono" />
                <p className="text-xs text-ud-text-muted mt-5">{t("Net {net} posts to the expense account; VAT {vat} to Input VAT Recoverable (1250).", { net: (form.amount - form.vatAmount).toLocaleString(), vat: form.vatAmount.toLocaleString() })}</p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t("Delete expense?")}
        message={t("This reverses its ledger entry. This can't be undone.")}
        confirmLabel={t("Delete")}
        onConfirm={() => void confirmDelete()}
      />
    </PageWrapper>
  );
}
