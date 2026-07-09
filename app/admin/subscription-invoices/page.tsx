"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Check, X, FileText } from "lucide-react";
import { useAdminSubscriptionInvoices } from "@/lib/hooks/admin/useAdminSubscriptionInvoices";
import { AdminPageTitle, AdminPanel, StatusPill } from "@/components/admin/primitives";
import { AdminTable } from "@/components/admin/AdminTable";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatTZS } from "@/lib/utils/currency";
import { useT } from "@/lib/hooks/useT";
import type { AdminSubscriptionInvoiceRow } from "@/lib/server/actions/admin/types";

type Pending = { kind: "approve" | "cancel"; invoice: AdminSubscriptionInvoiceRow } | null;

export default function AdminSubscriptionInvoicesPage() {
  const t = useT();
  const { invoices, loading, approve, approveSelected, cancel } = useAdminSubscriptionInvoices();
  const [pending, setPending] = useState<Pending>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const awaiting = invoices.filter((r) => r.status === "unpaid" && r.submittedAt);
  const selectedRows = invoices.filter((r) => selected.has(r.id));
  const selectedTotal = selectedRows.reduce((s, r) => s + r.amountTzs, 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function run() {
    if (!pending) return;
    const { kind, invoice } = pending;
    const res = kind === "approve" ? await approve(invoice.id) : await cancel(invoice.id);
    if (res.ok) {
      toast.success(kind === "approve" ? t("Payment approved · tenant notified") : t("Invoice cancelled · tenant notified"));
    } else {
      toast.error(res.error);
    }
    setPending(null);
  }

  async function runBulk() {
    const res = await approveSelected([...selected]);
    if (!res.ok) return toast.error(res.error);
    const { approved, skipped } = res.data;
    toast.success(skipped.length > 0 ? t("Approved {n} · skipped {s}", { n: approved, s: skipped.length }) : t("Approved {n} payment(s) · tenants notified", { n: approved }));
    setSelected(new Set());
    setBulkOpen(false);
  }

  return (
    <div>
      <AdminPageTitle
        title={t("Subscription invoices")}
        subtitle={t("Bank-transfer invoices from onboarding and plan changes. Approve a payment to activate the account.")}
      />
      <AdminPanel>
        {!loading && awaiting.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b border-ud-border">
            <span className="text-sm text-ud-text-secondary">{t("{n} awaiting approval", { n: awaiting.length })}</span>
            <button onClick={() => setSelected(new Set(awaiting.map((r) => r.id)))} className="text-xs font-medium text-ud-primary hover:underline">{t("Select all pending")}</button>
            {selected.size > 0 && (
              <button onClick={() => setSelected(new Set())} className="text-xs text-ud-text-muted hover:text-ud-text-primary">{t("Clear")}</button>
            )}
            <div className="ml-auto">
              <Button size="sm" variant="primary" disabled={selected.size === 0} onClick={() => setBulkOpen(true)}>
                {t("Approve selected ({k})", { k: selected.size })}
              </Button>
            </div>
          </div>
        )}
        {loading ? (
          <div className="py-14 text-center text-sm text-ud-text-muted">{t("Loading…")}</div>
        ) : (
          <AdminTable<AdminSubscriptionInvoiceRow>
            data={invoices}
            rowKey={(r) => r.id}
            caption={t("Subscription invoices")}
            emptyLabel={t("No subscription invoices yet.")}
            columns={[
              {
                key: "select",
                label: "",
                render: (r) => r.status === "unpaid" ? (
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                    className="w-4 h-4 rounded border-ud-border text-ud-primary focus-visible:ring-2 focus-visible:ring-ud-primary cursor-pointer"
                    aria-label={t("Select invoice {n}", { n: r.number })}
                  />
                ) : null,
              },
              { key: "number", label: t("Invoice"), render: (r) => <span className="font-mono text-xs">{r.number}</span> },
              { key: "tenantName", label: t("Tenant"), render: (r) => r.tenantName ?? r.billToCompany },
              { key: "planName", label: t("Plan"), render: (r) => r.planName },
              { key: "submittedAt", label: t("Submitted"), render: (r) => (r.submittedAt ? r.submittedAt.slice(0, 10) : "—") },
              { key: "dueAt", label: t("Due"), render: (r) => r.dueAt.slice(0, 10) },
              { key: "status", label: t("Status"), render: (r) => <StatusPill value={r.status} /> },
              { key: "amountTzs", label: t("Amount"), align: "right", render: (r) => formatTZS(r.amountTzs) },
              {
                key: "actions",
                label: "",
                align: "right",
                render: (r) => (
                  <div className="flex items-center justify-end gap-3">
                    <a
                      href={`/api/billing/subscription-invoice/${r.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-ud-text-muted hover:text-ud-primary"
                      title={t("View PDF")}
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </a>
                    {r.status === "unpaid" && (
                      <>
                        <button
                          onClick={() => setPending({ kind: "approve", invoice: r })}
                          className="inline-flex items-center gap-1 text-xs font-medium text-ud-success hover:text-emerald-700"
                        >
                          <Check className="w-3.5 h-3.5" /> {t("Approve")}
                        </button>
                        <button
                          onClick={() => setPending({ kind: "cancel", invoice: r })}
                          className="inline-flex items-center gap-1 text-xs text-ud-danger hover:text-red-700"
                        >
                          <X className="w-3.5 h-3.5" /> {t("Cancel")}
                        </button>
                      </>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </AdminPanel>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        title={pending?.kind === "approve" ? t("Approve payment?") : t("Cancel invoice?")}
        message={
          pending?.kind === "approve"
            ? t("Confirm the bank transfer for {number} was received. This activates the account on the {plan} plan.", {
                number: pending.invoice.number,
                plan: pending.invoice.planName,
              })
            : pending
              ? t("Cancel invoice {number}? The tenant can pick a plan again.", { number: pending.invoice.number })
              : ""
        }
        confirmLabel={pending?.kind === "approve" ? t("Approve & activate") : t("Cancel invoice")}
        variant={pending?.kind === "approve" ? "primary" : "danger"}
        onConfirm={() => void run()}
      />

      <ConfirmDialog
        open={bulkOpen}
        onOpenChange={(o) => !o && setBulkOpen(false)}
        title={t("Approve {k} payment(s)?", { k: selected.size })}
        message={t("Confirm the bank transfers for {k} invoice(s) totalling {amt} were received. Each account is activated and the tenant is notified.", { k: selected.size, amt: formatTZS(selectedTotal) })}
        confirmLabel={t("Approve all selected")}
        variant="primary"
        onConfirm={() => void runBulk()}
      />
    </div>
  );
}
