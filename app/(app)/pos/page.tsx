"use client";
import { useState, useEffect, useMemo } from "react";
import { Plus, Receipt as ReceiptIcon } from "lucide-react";
import toast from "react-hot-toast";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatRowSkeleton } from "@/components/skeletons/StatRowSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { SaleLineEditor, newLine, linesValid, linesTotal, type EditorLine } from "@/components/pos/SaleLineEditor";
import { useBranches } from "@/lib/hooks/useBranches";
import { useInventory } from "@/lib/hooks/useInventory";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { usePOSSales, recordSale, type POSFilter } from "@/lib/hooks/usePOS";
import { formatTZS } from "@/lib/utils/currency";
import { formatDateTime } from "@/lib/utils/dates";
import { useT } from "@/lib/hooks/useT";
import type { POSSale, PaymentMethod } from "@/types";

const PAYMENT_BADGE: Record<PaymentMethod, "teal" | "info" | "gold"> = { mpesa: "teal", cash: "info", card: "gold" };

export default function POSSalesPage() {
  const t = useT();
  const { branches } = useBranches();
  const { inventory, refresh: refreshInventory } = useInventory();
  const { customers } = useCustomers();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [active, setActive] = useState<POSSale | null>(null);

  const filter = useMemo<POSFilter>(
    () => ({
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      ...(branchFilter !== "all" ? { branchId: branchFilter } : {}),
      ...(methodFilter !== "all" ? { paymentMethod: methodFilter as PaymentMethod } : {}),
    }),
    [from, to, branchFilter, methodFilter],
  );
  const { sales, loading, refresh } = usePOSSales(filter);

  // Record-sale modal state
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lines, setLines] = useState<EditorLine[]>([newLine()]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [branchId, setBranchId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState(0);
  const [tendered, setTendered] = useState(0);
  const [paymentRef, setPaymentRef] = useState("");

  useEffect(() => {
    if (!branchId && branches.length > 0) setBranchId(branches.find((b) => b.isPrimary)?.id ?? branches[0]!.id);
  }, [branches, branchId]);

  const totalSales = sales.reduce((s, x) => s + x.total, 0);
  const grossProfit = sales.reduce((s, x) => s + x.grossProfit, 0);
  const avgBasket = sales.length > 0 ? totalSales / sales.length : 0;
  const canSubmit = linesValid(lines, inventory);

  const gross = linesTotal(lines);
  const orderDiscount = Math.min(Math.max(0, discount), gross);
  const payable = gross - orderDiscount;
  const changeDue = paymentMethod === "cash" && tendered > 0 ? Math.max(0, tendered - payable) : 0;

  function openModal() {
    setLines([newLine()]);
    setPaymentMethod("cash");
    setCustomerId("");
    setDiscount(0);
    setTendered(0);
    setPaymentRef("");
    setOpen(true);
  }

  async function submit() {
    if (!canSubmit) {
      toast.error(t("Fix the highlighted items before recording the sale"));
      return;
    }
    setSaving(true);
    try {
      const res = await recordSale({
        paymentMethod,
        ...(branchId ? { branchId } : {}),
        ...(customerId ? { customerId } : {}),
        ...(orderDiscount > 0 ? { discountAmount: orderDiscount } : {}),
        ...(paymentMethod === "cash" && tendered > 0 ? { amountTendered: tendered } : {}),
        ...(paymentRef.trim() ? { paymentRef: paymentRef.trim() } : {}),
        lines: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity, unitPrice: l.unitPrice })),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("Sale {ref} recorded", { ref: res.data.receiptNumber }));
      setOpen(false);
      await Promise.all([refresh(), refreshInventory()]);
    } finally {
      setSaving(false);
    }
  }

  const COLS: Column<POSSale>[] = [
    { key: "receiptNumber", label: "Reference", sortable: true, className: "font-mono text-xs", width: "130px" },
    { key: "soldAt", label: "Date & time", sortable: true, accessor: (r) => r.soldAt, render: (r) => <span className="text-ud-text-secondary">{formatDateTime(r.soldAt)}</span> },
    { key: "branchName", label: "Branch", render: (r) => <Badge variant="default" size="sm">{r.branchName || ""}</Badge> },
    { key: "customerName", label: "Customer", render: (r) => <span className="truncate">{r.customerName}</span> },
    { key: "cashierName", label: "Cashier", render: (r) => <span className="truncate text-ud-text-secondary">{r.cashierName || "—"}</span> },
    { key: "paymentMethod", label: "Method", render: (r) => <Badge variant={PAYMENT_BADGE[r.paymentMethod]} size="sm">{r.paymentMethod.toUpperCase()}</Badge> },
    { key: "status", label: "Status", render: (r) => r.status === "refunded"
      ? <Badge variant="danger" size="sm">{t("Refunded")}</Badge>
      : <Badge variant="success" size="sm">{t("Paid")}</Badge> },
    { key: "grossProfit", label: "Profit", sortable: true, align: "right", accessor: (r) => r.grossProfit, render: (r) => <CurrencyDisplay amount={r.grossProfit} showSymbol={false} colored /> },
    { key: "total", label: "Total", sortable: true, align: "right", accessor: (r) => r.total, render: (r) => <CurrencyDisplay amount={r.total} showSymbol={false} className="font-medium" /> },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Sales"
        subtitle="Record sales and track performance across branches and dates"
        actions={<Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openModal}>{t("Record sale")}</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-5 p-4 bg-white border border-ud-border rounded-2xl shadow-card">
        <div>
          <label className="block text-xs font-medium text-ud-text-secondary mb-1.5">{t("From")}</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-ud-border text-sm focus:outline-none focus:ring-2 focus:ring-ud-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-ud-text-secondary mb-1.5">{t("To")}</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-ud-border text-sm focus:outline-none focus:ring-2 focus:ring-ud-primary" />
        </div>
        <Select label="Branch" value={branchFilter} onValueChange={setBranchFilter}
          options={[{ value: "all", label: "All branches" }, ...branches.map((b) => ({ value: b.id, label: b.name }))]} />
        <Select label="Payment method" value={methodFilter} onValueChange={setMethodFilter}
          options={[{ value: "all", label: "All methods" }, { value: "mpesa", label: "M-Pesa" }, { value: "cash", label: "Cash" }, { value: "card", label: "Card" }]} />
      </div>

      {loading ? <StatRowSkeleton /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total sales" value={totalSales} variant="teal" prefix="TSh" format="compact" />
          <StatCard label="Gross profit" value={grossProfit} variant="emerald" prefix="TSh" format="compact" />
          <StatCard label="Transactions" value={sales.length} variant="blue" format="raw" />
          <StatCard label="Average sale" value={avgBasket} variant="gold" prefix="TSh" format="compact" />
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={10} columns={7} />
      ) : sales.length === 0 ? (
        <EmptyState
          icon={ReceiptIcon}
          title="No sales yet"
          description="Record your first sale make sure your products have stock on the Inventory page first."
          action={{ label: "Record sale", onClick: openModal, icon: <Plus className="w-4 h-4" /> }}
        />
      ) : (
        <DataTable data={sales} columns={COLS} pageSize={15} initialSortKey="soldAt" initialSortDir="desc" rowKey={(r) => r.id} onRowClick={(r) => setActive(r)} />
      )}

      <ReceiptModal sale={active} onClose={() => setActive(null)} onRefunded={() => void Promise.all([refresh(), refreshInventory()])} />

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Record sale"
        description="Select products from your inventory. You can't sell more than you have in stock."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
            <Button variant="primary" loading={saving} disabled={!canSubmit} onClick={() => void submit()}>
              {t("Record {total}", { total: formatTZS(payable) })}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <SaleLineEditor inventory={inventory} lines={lines} onChange={setLines} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-ud-border">
            <Select label="Payment method" value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              options={[{ value: "cash", label: "Cash" }, { value: "mpesa", label: "M-Pesa" }, { value: "card", label: "Card" }]} />
            {branches.length > 0 && (
              <Select label="Branch" value={branchId} onValueChange={setBranchId}
                options={branches.map((b) => ({ value: b.id, label: b.name }))} />
            )}
            <Select label={t("Customer")} value={customerId} onValueChange={setCustomerId}
              options={[{ value: "", label: t("Walk-in customer") }, ...customers.map((c) => ({ value: c.id, label: c.name }))]} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label={t("Discount (TZS)")} type="number" value={String(discount)} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))} />
            {paymentMethod === "cash" ? (
              <Input label={t("Amount tendered")} type="number" value={String(tendered)} onChange={(e) => setTendered(Math.max(0, Number(e.target.value) || 0))} />
            ) : (
              <Input label={t("Payment reference")} value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder={paymentMethod === "mpesa" ? "M-Pesa code" : "Approval code"} />
            )}
          </div>

          <div className="space-y-1.5 pt-3 border-t border-ud-border text-sm">
            <div className="flex justify-between text-ud-text-secondary">
              <span>{t("Subtotal")}</span><span className="tabular-nums">{formatTZS(gross)}</span>
            </div>
            {orderDiscount > 0 && (
              <div className="flex justify-between text-ud-text-secondary">
                <span>{t("Discount")}</span><span className="tabular-nums">- {formatTZS(orderDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1">
              <span className="font-medium">{t("Total")}</span>
              <span className="font-display font-bold text-lg tabular-nums">{formatTZS(payable)}</span>
            </div>
            {paymentMethod === "cash" && tendered > 0 && (
              <div className="flex justify-between text-ud-primary font-medium">
                <span>{t("Change due")}</span><span className="tabular-nums">{formatTZS(changeDue)}</span>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
