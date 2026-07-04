"use client";
import { useState, useEffect } from "react";
import { Printer, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useCompany } from "@/lib/hooks/useCompany";
import { refundSale } from "@/lib/hooks/usePOS";
import { formatTZS } from "@/lib/utils/currency";
import { formatDateTime } from "@/lib/utils/dates";
import { useT } from "@/lib/hooks/useT";
import type { POSSale } from "@/types";

export function ReceiptModal({ sale, onClose, onRefunded }: { sale: POSSale | null; onClose: () => void; onRefunded?: () => void }) {
  const { company } = useCompany();
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  const [refunding, setRefunding] = useState(false);

  useEffect(() => {
    setConfirming(false);
  }, [sale]);

  async function doRefund() {
    if (!sale) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setRefunding(true);
    try {
      const res = await refundSale(sale.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("Sale refunded"));
      onRefunded?.();
      onClose();
    } finally {
      setRefunding(false);
      setConfirming(false);
    }
  }

  const canRefund = sale?.status === "completed";

  return (
    <Modal
      open={sale !== null}
      onOpenChange={(o) => !o && onClose()}
      title="Receipt"
      description={sale ? sale.receiptNumber : ""}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t("Close")}</Button>
          {canRefund && onRefunded && (
            <Button variant="danger" icon={<RotateCcw className="w-4 h-4" />} loading={refunding} onClick={() => void doRefund()}>
              {confirming ? t("Confirm refund?") : t("Refund")}
            </Button>
          )}
          <Button variant="primary" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>{t("Print")}</Button>
        </>
      }
    >
      {sale && (
        <div id="receipt-print" className="font-mono text-xs text-ud-text-primary">
          {sale.status === "refunded" && (
            <div className="mb-3 flex justify-center">
              <Badge variant="danger" size="sm">{t("REFUNDED")}</Badge>
            </div>
          )}
          <div className="text-center pb-3 border-b border-dashed border-ud-border">
            <div className="font-display font-bold text-sm">{company?.name ?? "Uhasibu Digito"}</div>
            {company?.tin && <div className="text-ud-text-muted">TIN: {company.tin}</div>}
            {sale.branchName && <div className="text-ud-text-muted">{sale.branchName}</div>}
          </div>

          <div className="py-3 space-y-1 border-b border-dashed border-ud-border">
            <Row label={t("Receipt")} value={sale.receiptNumber} />
            <Row label={t("Date")} value={formatDateTime(sale.soldAt)} />
            {sale.cashierName && <Row label={t("Cashier")} value={sale.cashierName} />}
            <Row label={t("Customer")} value={sale.customerName} />
            <Row label={t("Payment")} value={sale.paymentMethod.toUpperCase() + (sale.paymentRef ? ` · ${sale.paymentRef}` : "")} />
            {sale.efdNumber && <Row label="EFD" value={sale.efdNumber} />}
          </div>

          <div className="py-3 space-y-1.5 border-b border-dashed border-ud-border">
            {sale.lines.map((l) => (
              <div key={l.id} className="flex justify-between gap-2">
                <span className="truncate">{l.itemName} ×{l.quantity}</span>
                <span className="tabular-nums">{formatTZS(l.lineTotal)}</span>
              </div>
            ))}
          </div>

          <div className="py-3 space-y-1 border-b border-dashed border-ud-border">
            <Row label={t("Subtotal")} value={formatTZS(sale.subtotal)} />
            {sale.discount > 0 && <Row label={t("Discount")} value={`- ${formatTZS(sale.discount)}`} />}
            <Row label={t("VAT (incl. 18%)")} value={formatTZS(sale.vatAmount)} />
          </div>

          <div className="py-3">
            <div className="flex justify-between font-bold text-sm">
              <span>{t("TOTAL")}</span>
              <span className="tabular-nums">{formatTZS(sale.total)}</span>
            </div>
            {sale.amountTendered !== null && (
              <div className="mt-1.5 space-y-1">
                <Row label={t("Tendered")} value={formatTZS(sale.amountTendered)} />
                <Row label={t("Change")} value={formatTZS(sale.changeDue ?? 0)} />
              </div>
            )}
          </div>

          <div className="text-center text-ud-text-muted pt-2 border-t border-dashed border-ud-border">
            {t("Asante kwa kununua · Thank you")}
          </div>
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-ud-text-muted">{label}</span>
      <span className="tabular-nums text-right">{value}</span>
    </div>
  );
}
