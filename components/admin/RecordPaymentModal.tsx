"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { recordPayment } from "@/lib/server/actions/admin/payments";

const METHODS = [
  { value: "manual", label: "Manual" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "bank", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
];

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function RecordPaymentModal({
  open,
  onOpenChange,
  tenantId,
  tenantOptions,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId?: string;
  tenantOptions?: { value: string; label: string }[];
  onDone?: () => void;
}) {
  const [selectedTenant, setSelectedTenant] = useState(tenantId ?? "");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("manual");
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState(today());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const effectiveTenant = tenantId ?? selectedTenant;

  const submit = async () => {
    setSaving(true);
    const res = await recordPayment({
      tenantId: effectiveTenant,
      amountTzs: Number(amount),
      method,
      reference,
      paidAt: new Date(paidAt),
      note,
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Payment recorded");
      onOpenChange(false);
      setAmount("");
      setReference("");
      setNote("");
      onDone?.();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Record payment" description="Log a manual subscription payment.">
      <div className="space-y-4">
        {!tenantId && tenantOptions && (
          <Select label="Tenant" value={selectedTenant} onValueChange={setSelectedTenant} options={tenantOptions} placeholder="Choose tenant" />
        )}
        <Input label="Amount (TZS)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="450000" />
        <Select label="Method" value={method} onValueChange={setMethod} options={METHODS} />
        <Input label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Receipt / txn ref" />
        <Input label="Paid on" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
        <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} loading={saving} disabled={!effectiveTenant || !(Number(amount) > 0)}>
            Record
          </Button>
        </div>
      </div>
    </Modal>
  );
}
