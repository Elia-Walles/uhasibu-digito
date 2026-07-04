"use client";
import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Minus, Trash2, ShoppingCart, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { useInventory } from "@/lib/hooks/useInventory";
import { useBranches } from "@/lib/hooks/useBranches";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { recordSale } from "@/lib/hooks/usePOS";
import { formatTZS } from "@/lib/utils/currency";
import { useT } from "@/lib/hooks/useT";
import type { InventoryItem, PaymentMethod, POSSale } from "@/types";
import { cn } from "@/lib/utils/cn";

interface CartLine {
  itemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  onHand: number;
}

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "card", label: "Card" },
];

export default function RegisterPage() {
  const t = useT();
  const { inventory, refresh: refreshInventory } = useInventory();
  const { branches } = useBranches();
  const { customers } = useCustomers();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [branchId, setBranchId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [discount, setDiscount] = useState(0);
  const [tendered, setTendered] = useState(0);
  const [paymentRef, setPaymentRef] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSale, setLastSale] = useState<POSSale | null>(null);

  useEffect(() => {
    if (!branchId && branches.length > 0) setBranchId(branches.find((b) => b.isPrimary)?.id ?? branches[0]!.id);
  }, [branches, branchId]);

  const products = useMemo(() => {
    const q = search.toLowerCase();
    return inventory.filter((i) => !q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
  }, [inventory, search]);

  const gross = cart.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const orderDiscount = Math.min(Math.max(0, discount), gross);
  const payable = gross - orderDiscount;
  const changeDue = paymentMethod === "cash" && tendered > 0 ? Math.max(0, tendered - payable) : 0;

  function addToCart(item: InventoryItem) {
    if (item.onHand <= 0) {
      toast.error(t("{name} is out of stock", { name: item.name }));
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.itemId === item.id);
      if (existing) {
        if (existing.quantity >= item.onHand) {
          toast.error(t("Only {n} of {name} in stock", { n: item.onHand, name: item.name }));
          return prev;
        }
        return prev.map((l) => (l.itemId === item.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { itemId: item.id, name: item.name, unitPrice: item.sellingPrice, quantity: 1, onHand: item.onHand }];
    });
  }

  function setQty(itemId: string, quantity: number) {
    setCart((prev) =>
      prev.flatMap((l) => {
        if (l.itemId !== itemId) return [l];
        const q = Math.min(Math.max(0, quantity), l.onHand);
        return q === 0 ? [] : [{ ...l, quantity: q }];
      }),
    );
  }

  function resetSale() {
    setCart([]);
    setDiscount(0);
    setTendered(0);
    setPaymentRef("");
    setCustomerId("");
    setPaymentMethod("cash");
  }

  async function charge() {
    if (cart.length === 0) {
      toast.error(t("Add a product first"));
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
        lines: cart.map((l) => ({ itemId: l.itemId, quantity: l.quantity, unitPrice: l.unitPrice })),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("Sale {ref} recorded", { ref: res.data.receiptNumber }));
      setLastSale(res.data);
      resetSale();
      await refreshInventory();
    } finally {
      setSaving(false);
    }
  }

  const fieldCls =
    "w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-ud-primary-glow/40";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0F1923] text-white -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 h-full">
        {/* Product grid */}
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="font-display text-xl font-bold">{t("Register")}</h1>
            {branches.length > 0 && (
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={cn(fieldCls, "w-auto")} aria-label={t("Branch")}>
                {branches.map((b) => <option key={b.id} value={b.id} className="text-ud-text-primary">{b.name}</option>)}
              </select>
            )}
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search products by name or SKU…")}
              className={cn(fieldCls, "pl-9")}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto max-h-[calc(100vh-14rem)] pr-1">
            {products.map((item) => {
              const out = item.onHand <= 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addToCart(item)}
                  disabled={out}
                  className={cn(
                    "text-left rounded-2xl border border-white/10 bg-white/5 p-3 transition-all",
                    out ? "opacity-40 cursor-not-allowed" : "hover:border-ud-primary-glow/50 hover:bg-white/10 active:scale-[0.98]",
                  )}
                >
                  <div className="aspect-square rounded-xl bg-white/5 flex items-center justify-center text-2xl mb-2">📦</div>
                  <div className="text-sm font-medium truncate">{item.name}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-mono text-sm text-ud-primary-glow">{formatTZS(item.sellingPrice)}</span>
                    <span className={cn("text-[11px]", out ? "text-ud-danger" : "text-white/50")}>{out ? t("Out") : `${item.onHand}`}</span>
                  </div>
                </button>
              );
            })}
            {products.length === 0 && (
              <div className="col-span-full text-center text-white/40 py-16 text-sm">{t("No products found")}</div>
            )}
          </div>
        </div>

        {/* Cart panel */}
        <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4 max-h-[calc(100vh-6rem)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-semibold">
              <ShoppingCart className="w-4 h-4 text-ud-primary-glow" /> {t("Cart")}
              <span className="text-white/40 text-sm">({cart.length})</span>
            </div>
            {cart.length > 0 && (
              <button onClick={resetSale} className="text-xs text-white/50 hover:text-ud-danger inline-flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> {t("Clear")}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {cart.length === 0 ? (
              <div className="text-center text-white/30 py-12 text-sm">{t("Tap products to add them")}</div>
            ) : (
              cart.map((l) => (
                <div key={l.itemId} className="rounded-xl bg-white/5 border border-white/10 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{l.name}</div>
                      <div className="text-xs text-white/40 font-mono">{formatTZS(l.unitPrice)}</div>
                    </div>
                    <button onClick={() => setQty(l.itemId, 0)} className="text-white/30 hover:text-ud-danger" aria-label={t("Remove")}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setQty(l.itemId, l.quantity - 1)} className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20" aria-label={t("Decrease")}>
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-mono text-sm">{l.quantity}</span>
                      <button onClick={() => setQty(l.itemId, l.quantity + 1)} disabled={l.quantity >= l.onHand} className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 disabled:opacity-30" aria-label={t("Increase")}>
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="font-mono text-sm font-medium tabular-nums">{formatTZS(l.quantity * l.unitPrice)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Payment controls */}
          <div className="mt-3 pt-3 border-t border-white/10 space-y-2.5">
            <div className="grid grid-cols-3 gap-1.5">
              {METHODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setPaymentMethod(m.value)}
                  className={cn(
                    "rounded-lg py-2 text-xs font-medium border transition-colors",
                    paymentMethod === m.value ? "bg-ud-primary border-ud-primary text-white" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10",
                  )}
                >
                  {t(m.label)}
                </button>
              ))}
            </div>

            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={fieldCls} aria-label={t("Customer")}>
              <option value="" className="text-ud-text-primary">{t("Walk-in customer")}</option>
              {customers.map((c) => <option key={c.id} value={c.id} className="text-ud-text-primary">{c.name}</option>)}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={String(discount)} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))} placeholder={t("Discount")} className={fieldCls} aria-label={t("Discount")} />
              {paymentMethod === "cash" ? (
                <input type="number" value={String(tendered)} onChange={(e) => setTendered(Math.max(0, Number(e.target.value) || 0))} placeholder={t("Tendered")} className={fieldCls} aria-label={t("Amount tendered")} />
              ) : (
                <input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder={t("Reference")} className={fieldCls} aria-label={t("Payment reference")} />
              )}
            </div>

            <div className="space-y-1 text-sm pt-1">
              {orderDiscount > 0 && (
                <div className="flex justify-between text-white/60"><span>{t("Discount")}</span><span className="tabular-nums">- {formatTZS(orderDiscount)}</span></div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-white/70">{t("Total")}</span>
                <span className="font-display font-bold text-2xl tabular-nums text-ud-primary-glow">{formatTZS(payable)}</span>
              </div>
              {paymentMethod === "cash" && tendered > 0 && (
                <div className="flex justify-between text-white/70"><span>{t("Change due")}</span><span className="tabular-nums">{formatTZS(changeDue)}</span></div>
              )}
            </div>

            <Button variant="primary" size="lg" fullWidth loading={saving} disabled={cart.length === 0} onClick={() => void charge()}>
              {t("Charge {total}", { total: formatTZS(payable) })}
            </Button>
          </div>
        </div>
      </div>

      <ReceiptModal sale={lastSale} onClose={() => setLastSale(null)} />
    </div>
  );
}
