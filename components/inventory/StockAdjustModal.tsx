"use client";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useT } from "@/lib/hooks/useT";
import type { RecordMovementInput } from "@/lib/hooks/useInventory";
import type { Result } from "@/lib/server/result";
import type { InventoryItem, Branch, MovementType } from "@/types";

type AdjustType = Extract<MovementType, "IN" | "OUT" | "ADJUSTMENT">;

interface StockAdjustModalProps {
  item: InventoryItem | null;
  branches: Branch[];
  onClose: () => void;
  recordMovement: (input: RecordMovementInput) => Promise<Result<{ itemId: string; newOnHand: number }>>;
}

/**
 * Adjust an item's stock: receive (IN), issue (OUT) or correct (ADJUSTMENT), optionally at a
 * specific branch. Reuses the inventory `recordMovement` action, which enforces stock on OUT
 * and re-averages cost on IN.
 */
export function StockAdjustModal({ item, branches, onClose, recordMovement }: StockAdjustModalProps) {
  const t = useT();
  const [type, setType] = useState<AdjustType>("IN");
  const [quantity, setQuantity] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [branchId, setBranchId] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setType("IN");
      setQuantity(0);
      setUnitCost(item.unitCost);
      setBranchId(branches.find((b) => b.isPrimary)?.id ?? branches[0]?.id ?? "");
      setReason("");
    }
  }, [item, branches]);

  async function submit() {
    if (!item) return;
    if (quantity === 0) {
      toast.error(t("Enter a quantity"));
      return;
    }
    // ADJUSTMENT takes a signed delta; IN/OUT take a positive magnitude.
    const qty = type === "ADJUSTMENT" ? quantity : Math.abs(quantity);
    setSaving(true);
    try {
      const res = await recordMovement({
        itemId: item.id,
        type,
        quantity: qty,
        unitCost: type === "IN" ? unitCost : item.unitCost,
        ...(branchId ? { branchId } : {}),
        ...(reason.trim() ? { narration: reason.trim() } : {}),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("Stock updated · {n} on hand", { n: res.data.newOnHand }));
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={item !== null}
      onOpenChange={(o) => !o && onClose()}
      title={t("Adjust stock")}
      description={item ? `${item.name} · ${item.code}` : ""}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t("Cancel")}</Button>
          <Button variant="primary" loading={saving} onClick={() => void submit()}>{t("Apply")}</Button>
        </>
      }
    >
      {item && (
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between rounded-xl bg-ud-surface-2 px-3 py-2.5">
            <span className="text-ud-text-muted">{t("Current on hand")}</span>
            <span className="font-mono font-semibold tabular-nums">{item.onHand} {item.unit}</span>
          </div>

          <Select
            label={t("Movement")}
            value={type}
            onValueChange={(v) => setType(v as AdjustType)}
            options={[
              { value: "IN", label: t("Receive (add stock)") },
              { value: "OUT", label: t("Issue (remove stock)") },
              { value: "ADJUSTMENT", label: t("Adjustment (± correction)") },
            ]}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={type === "ADJUSTMENT" ? t("Delta (±)") : t("Quantity")}
              type="number"
              value={String(quantity)}
              onChange={(e) => setQuantity(Number(e.target.value) || 0)}
            />
            {type === "IN" && (
              <Input
                label={t("Unit cost (TZS)")}
                type="number"
                value={String(unitCost)}
                onChange={(e) => setUnitCost(Math.max(0, Number(e.target.value) || 0))}
              />
            )}
          </div>

          {branches.length > 0 && (
            <Select
              label={t("Branch")}
              value={branchId}
              onValueChange={setBranchId}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />
          )}

          <Input label={t("Reason (optional)")} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("e.g. Delivery, damage, count correction")} />
        </div>
      )}
    </Modal>
  );
}
