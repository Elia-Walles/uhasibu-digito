"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Mail, Download, Link2 } from "lucide-react";
import toast from "react-hot-toast";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { FilterBar } from "@/components/ui/FilterBar";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Attachments } from "@/components/ui/Attachments";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { useInvoices } from "@/lib/hooks/useInvoices";
import { useT } from "@/lib/hooks/useT";
import { formatDate, isOverdue } from "@/lib/utils/dates";
import { formatTZS } from "@/lib/utils/currency";
import type { Invoice, InvoiceStatus } from "@/types";

const COLS: Column<Invoice>[] = [
  { key: "number",        label: "Invoice #",  sortable: true, className: "font-mono text-xs" },
  { key: "customerName",  label: "Customer",   sortable: true, render: (r) => <div className="font-medium truncate max-w-[200px]">{r.customerName}</div> },
  { key: "issueDate",     label: "Issued",     sortable: true, render: (r) => formatDate(r.issueDate) },
  { key: "dueDate",       label: "Due",        sortable: true, render: (r) => <span className={isOverdue(r.dueDate) && r.status !== "Paid" ? "text-ud-danger font-medium" : ""}>{formatDate(r.dueDate)}</span> },
  { key: "total",         label: "Total",      sortable: true, align: "right", render: (r) => <CurrencyDisplay amount={r.total} showSymbol={false} className="font-medium" /> },
  { key: "status",        label: "Status",     render: (r) => (
    <Badge variant={
      r.status === "Paid"      ? "success" :
      r.status === "Overdue"   ? "danger"  :
      r.status === "Sent"      ? "info"    :
      r.status === "Draft"     ? "warning" : "default"
    } pulse={r.status === "Overdue"}>
      {r.status}
    </Badge>
  ) },
];

type TabKey = "All" | "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled";
const ALL_STATUSES: InvoiceStatus[] = ["Draft", "Sent", "Paid", "Overdue", "Cancelled"];

export default function InvoicesPage() {
  const t = useT();
  const { invoices, updateInvoiceStatus, recordInvoicePayment, loading: invLoading } = useInvoices();
  const loading = invLoading;
  const [tab, setTab] = useState<TabKey>("All");
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("Bank Transfer");
  const [paying, setPaying] = useState(false);

  // Keep the modal's payment form pointed at the live invoice + defaulted to the outstanding amount.
  const active = editTarget ? invoices.find((i) => i.id === editTarget.id) ?? editTarget : null;
  const outstanding = active ? Math.max(0, active.total - active.amountPaid) : 0;

  async function recordPayment() {
    if (!active || payAmount <= 0) {
      toast.error(t("Enter a payment amount"));
      return;
    }
    setPaying(true);
    try {
      const res = await recordInvoicePayment({ invoiceId: active.id, amount: payAmount, method: payMethod });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("Payment recorded · receipt emailed"));
      setPayAmount(0);
    } finally {
      setPaying(false);
    }
  }

  const filtered = useMemo(() => {
    let data = invoices;
    if (tab !== "All") data = data.filter((i) => i.status === (tab as InvoiceStatus));
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((i) => i.number.toLowerCase().includes(q) || i.customerName.toLowerCase().includes(q));
    }
    return data;
  }, [invoices, tab, search]);

  const tabs = useMemo(() => [
    { value: "All",      label: "All",      badge: <Badge variant="default" size="sm">{invoices.length}</Badge> },
    { value: "Draft",    label: "Draft",    badge: <Badge variant="warning" size="sm">{invoices.filter((i) => i.status === "Draft").length}</Badge> },
    { value: "Sent",     label: "Sent",     badge: <Badge variant="info" size="sm">{invoices.filter((i) => i.status === "Sent").length}</Badge> },
    { value: "Paid",     label: "Paid",     badge: <Badge variant="success" size="sm">{invoices.filter((i) => i.status === "Paid").length}</Badge> },
    { value: "Overdue",  label: "Overdue",  badge: <Badge variant="danger" size="sm">{invoices.filter((i) => i.status === "Overdue").length}</Badge> },
    { value: "Cancelled", label: "Cancelled" },
  ], [invoices]);

  function applyStatus(invoice: Invoice, status: InvoiceStatus) {
    if (invoice.status === status) {
      setEditTarget(null);
      return;
    }
    void updateInvoiceStatus(invoice.id, status);
    // A receipt email is sent by the server only on the Paid transition.
    toast.success(status === "Paid" ? t("Marked paid · receipt emailed to customer") : t("Status updated"));
    setEditTarget(null);
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} invoices · TZS ${Math.round(invoices.reduce((s, i) => s + i.total, 0) / 1_000_000)}M total`}
        breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Invoices" }]}
        actions={
          <>
            <Link href="/sales/sent-log"><Button variant="outline" icon={<Mail className="w-4 h-4" />}>{t("Sent log")}</Button></Link>
            <ExportMenu fileLabel="Invoices" />
            <Link href="/sales/new-invoice"><Button variant="primary" icon={<Plus className="w-4 h-4" />}>{t("New invoice")}</Button></Link>
          </>
        }
      />

      <div className="bg-white border border-ud-border rounded-2xl shadow-card mb-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} tabs={tabs} />
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search invoice # or customer…" />

      {loading ? <TableSkeleton rows={10} columns={6} /> :
        <DataTable
          data={filtered}
          columns={COLS}
          pageSize={15}
          initialSortKey="issueDate"
          initialSortDir="desc"
          rowKey={(r) => r.id}
          onRowClick={(r) => setEditTarget(r)}
        />
      }

      <Modal
        open={editTarget !== null}
        onOpenChange={(o) => !o && setEditTarget(null)}
        title={editTarget ? t("Update {n}", { n: editTarget.number }) : ""}
        description={editTarget ? `${editTarget.customerName} · ${formatTZS(editTarget.total)}` : ""}
        size="md"
      >
        {editTarget && (
          <div className="space-y-3">
            <div className="text-xs text-ud-text-muted mb-2">{t("Pick a new status. Email notifications fire for statuses you enabled in Settings → Preferences.")}</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => applyStatus(editTarget, s)}
                  className={`p-3 rounded-xl border transition-all text-sm font-medium min-h-[64px] ${
                    editTarget.status === s
                      ? "border-ud-primary bg-ud-primary-50/60 text-ud-primary shadow-sm"
                      : "border-ud-border hover:border-ud-primary/40"
                  }`}
                >
                  {t(s)}
                  {s === "Paid" && (
                    <div className="text-[10px] text-ud-text-muted mt-1 inline-flex items-center gap-0.5"><Mail className="w-2.5 h-2.5" />{t("Emails receipt")}</div>
                  )}
                </button>
              ))}
            </div>
            {active && active.status !== "Draft" && active.status !== "Cancelled" && (
              <div className="pt-3 border-t border-ud-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-ud-text-muted">{t("Paid")}: <span className="font-mono">{formatTZS(active.amountPaid)}</span></span>
                  <span className="font-medium">{t("Outstanding")}: <span className="font-mono text-ud-primary">{formatTZS(outstanding)}</span></span>
                </div>
                {outstanding > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                    <Input label={t("Amount")} type="number" value={String(payAmount)} onChange={(e) => setPayAmount(Number(e.target.value) || 0)} className="text-right font-mono" />
                    <Select label={t("Method")} value={payMethod} onValueChange={setPayMethod}
                      options={[{ value: "Cash", label: "Cash" }, { value: "M-Pesa", label: "M-Pesa" }, { value: "Bank Transfer", label: "Bank Transfer" }, { value: "Cheque", label: "Cheque" }, { value: "Card", label: "Card" }]} />
                    <Button variant="primary" loading={paying} onClick={() => void recordPayment()}>{t("Record payment")}</Button>
                  </div>
                )}
              </div>
            )}
            {editTarget.status !== "Draft" && editTarget.status !== "Cancelled" && (
              <div className="pt-3 border-t border-ud-border flex flex-wrap items-center gap-4">
                <a href={`/api/invoices/${editTarget.id}/pdf`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-ud-primary hover:underline">
                  <Download className="w-3.5 h-3.5" /> {t("Download PDF")}
                </a>
                {editTarget.publicToken && (
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(`${window.location.origin}/invoice/${editTarget.publicToken}`).then(() => toast.success(t("Public link copied")));
                    }}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-ud-text-secondary hover:text-ud-primary"
                  >
                    <Link2 className="w-3.5 h-3.5" /> {t("Copy public link")}
                  </button>
                )}
              </div>
            )}
            {editTarget.status === "Draft" && (
              <div className="pt-3 border-t border-ud-border">
                <Link href={`/sales/new-invoice?id=${editTarget.id}`} className="text-sm font-medium text-ud-primary hover:underline">{t("Edit this draft →")}</Link>
              </div>
            )}
            <div className="pt-3 border-t border-ud-border">
              <Attachments ownerType="Invoice" ownerId={editTarget.id} label={t("Invoice documents")} />
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
