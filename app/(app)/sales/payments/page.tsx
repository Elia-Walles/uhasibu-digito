"use client";
import { useState, useMemo, useEffect } from "react";
import { Plus, CreditCard, Smartphone, Banknote } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { useInvoices } from "@/lib/hooks/useInvoices";
import { useT } from "@/lib/hooks/useT";
import { formatDate } from "@/lib/utils/dates";
import { formatTZS } from "@/lib/utils/currency";
import toast from "react-hot-toast";
import type { InvoicePayment } from "@/types";

const METHOD_ICON: Record<string, typeof Smartphone> = {
  "M-Pesa": Smartphone, "Tigo Pesa": Smartphone, "Airtel": Smartphone,
  "Bank Transfer": CreditCard, "Card": CreditCard, "Cash": Banknote, "Cheque": CreditCard,
};

export default function PaymentsPage() {
  const t = useT();
  const { invoices, payments, recordInvoicePayment, loading } = useInvoices();
  const [open, setOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("M-Pesa");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  // Issued invoices still carrying a balance.
  const unpaid = useMemo(
    () => invoices.filter((i) => i.status !== "Draft" && i.status !== "Cancelled" && i.total - i.amountPaid > 0.01),
    [invoices],
  );
  const selected = unpaid.find((i) => i.id === invoiceId);

  useEffect(() => {
    if (open && !invoiceId && unpaid.length > 0) setInvoiceId(unpaid[0]!.id);
  }, [open, invoiceId, unpaid]);
  useEffect(() => {
    if (selected) setAmount(Math.round((selected.total - selected.amountPaid) * 100) / 100);
  }, [selected]);

  async function save() {
    if (!selected) return toast.error(t("Select an invoice"));
    if (amount <= 0) return toast.error(t("Enter a payment amount"));
    setSaving(true);
    try {
      const res = await recordInvoicePayment({ invoiceId: selected.id, amount, method, reference });
      if (!res.ok) return toast.error(res.error);
      toast.success(t("Payment recorded · receipt emailed"));
      setOpen(false);
      setInvoiceId("");
      setReference("");
    } finally {
      setSaving(false);
    }
  }

  const COLS: Column<InvoicePayment>[] = [
    { key: "paidAt", label: "Date", sortable: true, render: (r) => formatDate(r.paidAt) },
    { key: "invoiceNumber", label: "Invoice", className: "font-mono text-xs" },
    { key: "customerName", label: "Customer", sortable: true },
    { key: "method", label: "Method", render: (r) => {
      const Icon = METHOD_ICON[r.method] ?? CreditCard;
      return <Badge variant="default"><Icon className="w-2.5 h-2.5" />{r.method}</Badge>;
    } },
    { key: "reference", label: "Reference", className: "font-mono text-xs", render: (r) => r.reference || "—" },
    { key: "amount", label: "Amount", sortable: true, align: "right", render: (r) => <CurrencyDisplay amount={r.amount} className="font-bold" /> },
  ];

  const totalReceived = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <PageWrapper>
      <PageHeader
        title="Payments"
        subtitle={`${payments.length} payments received · ${formatTZS(totalReceived)}`}
        breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Payments" }]}
        actions={<Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setOpen(true)}>{t("Record payment")}</Button>}
      />
      {loading ? <TableSkeleton rows={10} columns={6} /> : payments.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title="No payments yet"
          description="Record a payment against a sent invoice — it posts Dr Cash, Cr Receivables to the ledger."
          action={{ label: "Record payment", onClick: () => setOpen(true), icon: <Plus className="w-4 h-4" /> }}
        />
      ) : (
        <DataTable data={payments} columns={COLS} pageSize={15} initialSortKey="paidAt" initialSortDir="desc" rowKey={(r) => r.id} />
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Record payment"
        description={t("Posts Dr Cash/Bank, Cr Trade Receivables to the general ledger.")}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>{t("Cancel")}</Button><Button variant="primary" loading={saving} disabled={unpaid.length === 0} onClick={() => void save()}>{t("Save")}</Button></>}
      >
        {unpaid.length === 0 ? (
          <p className="text-sm text-ud-text-muted">{t("No sent invoices are awaiting payment.")}</p>
        ) : (
          <div className="space-y-3">
            <Select label="Invoice" value={invoiceId} onValueChange={setInvoiceId}
              options={unpaid.map((i) => ({ value: i.id, label: `${i.number} · ${i.customerName} · ${formatTZS(i.total - i.amountPaid)} due` }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label={t("Amount")} type="number" value={String(amount)} onChange={(e) => setAmount(Number(e.target.value) || 0)} className="text-right font-mono" />
              <Select label="Method" value={method} onValueChange={setMethod}
                options={["M-Pesa", "Tigo Pesa", "Bank Transfer", "Cash", "Cheque", "Card"].map((m) => ({ value: m, label: m }))} />
            </div>
            <Input label={t("Reference")} value={reference} onChange={(e) => setReference(e.target.value)} placeholder={t("Transaction reference")} />
            {selected && (
              <div className="text-xs text-ud-text-muted">
                {t("Invoice total")} {formatTZS(selected.total)} · {t("already paid")} {formatTZS(selected.amountPaid)}
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
