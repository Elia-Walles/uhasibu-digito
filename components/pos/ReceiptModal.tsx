"use client";
import { Printer } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useCompany } from "@/lib/hooks/useCompany";
import { formatTZS } from "@/lib/utils/currency";
import { formatDateTime } from "@/lib/utils/dates";
import type { POSSale } from "@/types";

export function ReceiptModal({ sale, onClose }: { sale: POSSale | null; onClose: () => void }) {
  const { company } = useCompany();

  return (
    <Modal
      open={sale !== null}
      onOpenChange={(o) => !o && onClose()}
      title="Receipt"
      description={sale ? sale.receiptNumber : ""}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button variant="primary" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>Print</Button>
        </>
      }
    >
      {sale && (
        <div className="font-mono text-xs text-ud-text-primary">
          <div className="text-center pb-3 border-b border-dashed border-ud-border">
            <div className="font-display font-bold text-sm">{company?.name ?? "Uhasibu Digito"}</div>
            {company?.tin && <div className="text-ud-text-muted">TIN: {company.tin}</div>}
            {sale.branchName && <div className="text-ud-text-muted">{sale.branchName}</div>}
          </div>

          <div className="py-3 space-y-1 border-b border-dashed border-ud-border">
            <Row label="Receipt" value={sale.receiptNumber} />
            <Row label="Date" value={formatDateTime(sale.soldAt)} />
            <Row label="Customer" value={sale.customerName} />
            <Row label="Payment" value={sale.paymentMethod.toUpperCase()} />
          </div>

          <div className="py-3 space-y-1.5 border-b border-dashed border-ud-border">
            {sale.lines.map((l) => (
              <div key={l.id} className="flex justify-between gap-2">
                <span className="truncate">{l.itemName} ×{l.quantity}</span>
                <span className="tabular-nums">{formatTZS(l.lineTotal)}</span>
              </div>
            ))}
          </div>

          <div className="py-3">
            <div className="flex justify-between font-bold text-sm">
              <span>TOTAL</span>
              <span className="tabular-nums">{formatTZS(sale.total)}</span>
            </div>
          </div>

          <div className="text-center text-ud-text-muted pt-2 border-t border-dashed border-ud-border">
            Asante kwa kununua · Thank you
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
