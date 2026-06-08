"use client";
import { useState } from "react";
import { FileText, Printer } from "lucide-react";
import toast from "react-hot-toast";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { SaleLineEditor, newLine, linesValid, linesTotal, type EditorLine } from "@/components/pos/SaleLineEditor";
import { useInventory } from "@/lib/hooks/useInventory";
import { useInvoices } from "@/lib/hooks/useInvoices";
import { createInvoice as createPOSInvoice } from "@/lib/hooks/usePOS";
import { useCompany } from "@/lib/hooks/useCompany";
import { formatTZS } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import type { Invoice, InvoiceStatus } from "@/types";

const STATUS_BADGE: Record<InvoiceStatus, "success" | "info" | "warning" | "danger" | "default"> = {
  Paid: "success", Sent: "info", Draft: "warning", Overdue: "danger", Cancelled: "default",
};

export default function POSInvoicePage() {
  const { inventory, refresh: refreshInventory } = useInventory();
  const { invoices, loading, refresh: refreshInvoices } = useInvoices();
  const { company } = useCompany();

  const [customerName, setCustomerName] = useState("");
  const [lines, setLines] = useState<EditorLine[]>([newLine()]);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState<Invoice | null>(null);

  const canSubmit = customerName.trim().length > 0 && linesValid(lines, inventory);

  async function create() {
    if (!canSubmit) {
      toast.error("Add a customer and at least one in-stock item");
      return;
    }
    setSaving(true);
    try {
      const res = await createPOSInvoice({
        customerName: customerName.trim(),
        lines: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity, unitPrice: l.unitPrice })),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Invoice ${res.data.number} created`);
      setCustomerName("");
      setLines([newLine()]);
      await Promise.all([refreshInvoices(), refreshInventory()]);
    } finally {
      setSaving(false);
    }
  }

  const COLS: Column<Invoice>[] = [
    { key: "number", label: "Invoice", sortable: true, className: "font-mono text-xs", width: "130px" },
    { key: "issueDate", label: "Date", sortable: true, accessor: (r) => r.issueDate, render: (r) => <span className="text-ud-text-secondary">{formatDate(r.issueDate)}</span> },
    { key: "customerName", label: "Customer", render: (r) => <span className="truncate">{r.customerName}</span> },
    { key: "status", label: "Status", render: (r) => <Badge variant={STATUS_BADGE[r.status]} size="sm">{r.status}</Badge> },
    { key: "total", label: "Total", sortable: true, align: "right", accessor: (r) => r.total, render: (r) => <CurrencyDisplay amount={r.total} showSymbol={false} className="font-medium" /> },
  ];

  return (
    <PageWrapper>
      <PageHeader title="Invoice" subtitle="Create a customer invoice from your inventory" breadcrumbs={[{ label: "Point of Sale", href: "/pos" }, { label: "Invoice" }]} />

      <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card mb-6">
        <h3 className="font-display font-bold text-base mb-4">New invoice</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <Input label="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Asha Mushi" />
        </div>
        <SaleLineEditor inventory={inventory} lines={lines} onChange={setLines} />
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-ud-border">
          <div>
            <div className="text-xs text-ud-text-muted">Total</div>
            <div className="font-display font-bold text-lg tabular-nums">{formatTZS(linesTotal(lines))}</div>
          </div>
          <Button variant="primary" loading={saving} disabled={!canSubmit} onClick={() => void create()} icon={<FileText className="w-4 h-4" />}>
            Create invoice
          </Button>
        </div>
      </div>

      <h3 className="font-display font-bold text-base mb-3">Invoices</h3>
      {loading ? (
        <TableSkeleton rows={8} columns={5} />
      ) : invoices.length === 0 ? (
        <EmptyState icon={FileText} title="No invoices yet" description="Create your first invoice using the form above." />
      ) : (
        <DataTable data={invoices} columns={COLS} pageSize={10} initialSortKey="issueDate" initialSortDir="desc" rowKey={(r) => r.id} onRowClick={(r) => setActive(r)} />
      )}

      <Modal
        open={active !== null}
        onOpenChange={(o) => !o && setActive(null)}
        title="Invoice"
        description={active?.number ?? ""}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setActive(null)}>Close</Button>
            <Button variant="primary" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>Print</Button>
          </>
        }
      >
        {active && (
          <div className="text-sm">
            <div className="flex justify-between pb-3 border-b border-ud-border">
              <div>
                <div className="font-display font-bold">{company?.name ?? "Uhasibu Digito"}</div>
                {company?.tin && <div className="text-xs text-ud-text-muted">TIN: {company.tin}</div>}
              </div>
              <div className="text-right">
                <div className="font-mono font-medium">{active.number}</div>
                <div className="text-xs text-ud-text-muted">{formatDate(active.issueDate)}</div>
              </div>
            </div>
            <div className="py-3 border-b border-ud-border">
              <div className="text-xs text-ud-text-muted">Bill to</div>
              <div className="font-medium">{active.customerName}</div>
            </div>
            <table className="w-full my-3 text-sm">
              <thead>
                <tr className="text-xs text-ud-text-muted text-left">
                  <th className="py-1 font-medium">Item</th>
                  <th className="py-1 font-medium text-right">Qty</th>
                  <th className="py-1 font-medium text-right">Price</th>
                  <th className="py-1 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {active.lines.map((l) => (
                  <tr key={l.id} className="border-t border-ud-border">
                    <td className="py-1.5">{l.description}</td>
                    <td className="py-1.5 text-right font-mono">{l.quantity}</td>
                    <td className="py-1.5 text-right font-mono">{formatTZS(l.unitPrice)}</td>
                    <td className="py-1.5 text-right font-mono">{formatTZS(l.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between font-bold pt-2 border-t border-ud-border">
              <span>Total</span>
              <span className="font-mono tabular-nums">{formatTZS(active.total)}</span>
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
