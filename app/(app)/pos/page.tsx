"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingCart, X, Plus, Minus, Smartphone, Banknote, CheckCircle2, FileText, Store } from "lucide-react";
import { useSession } from "next-auth/react";
import { useInventory } from "@/lib/hooks/useInventory";
import { formatTZS, formatAmount } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import { useBranches } from "@/lib/hooks/useBranches";
import { recordSale } from "@/lib/hooks/usePOS";
import { useCompany } from "@/lib/hooks/useCompany";
import { useAppStore } from "@/lib/store/appStore";
import toast from "react-hot-toast";
import type { PaymentMethod } from "@/types";

interface CartLine {
  itemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export default function POSPage() {
  const { data: session } = useSession();
  const { company } = useCompany();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [category, setCategory] = useState<string>("All");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mpesa");
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "waiting" | "success">("idle");
  const [cashGiven, setCashGiven] = useState("");
  const [phone, setPhone] = useState("+255 712 345 678");
  const [efdNumber, setEfdNumber] = useState("");
  const [postedReceipt, setPostedReceipt] = useState<string | null>(null);
  const [branchId, setBranchId] = useState("");
  const { branches } = useBranches();
  const { inventory: INVENTORY, refresh: refreshInventory } = useInventory();
  const addNotification = useAppStore((s) => s.addNotification);

  // Default the branch selector to the primary branch once branches load.
  useEffect(() => {
    if (!branchId && branches.length > 0) {
      setBranchId(branches.find((b) => b.isPrimary)?.id ?? branches[0]!.id);
    }
  }, [branches, branchId]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(INVENTORY.map((i) => i.category)))], [INVENTORY]);
  const filtered = useMemo(() => {
    return INVENTORY.filter((i) => {
      if (category !== "All" && i.category !== category) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q);
    });
  }, [INVENTORY, search, category]);

  const subtotal = cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const vat = Math.round(subtotal * 0.18);
  const total = subtotal + vat;

  function addToCart(itemId: string) {
    const item = INVENTORY.find((i) => i.id === itemId);
    if (!item) return;
    setCart((prev) => {
      const exists = prev.find((l) => l.itemId === itemId);
      if (exists) return prev.map((l) => l.itemId === itemId ? { ...l, quantity: l.quantity + 1 } : l);
      return [...prev, { itemId, name: item.name, unitPrice: item.sellingPrice, quantity: 1 }];
    });
  }

  function adjust(itemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => l.itemId === itemId ? { ...l, quantity: l.quantity + delta } : l)
        .filter((l) => l.quantity > 0)
    );
  }

  async function processPayment() {
    setPaymentStatus("waiting");
    await new Promise((r) => setTimeout(r, paymentMethod === "mpesa" ? 3000 : 1500));
    const stamp = new Date();

    // One atomic backend call: EFD invoice + POS sale (with cost/profit) + stock decrement.
    const res = await recordSale({
      paymentMethod,
      ...(branchId ? { branchId } : {}),
      lines: cart.map((l) => ({ itemId: l.itemId, quantity: l.quantity, unitPrice: l.unitPrice })),
    });
    if (!res.ok) {
      toast.error(res.error);
      setPaymentStatus("idle");
      return;
    }
    const sale = res.data;
    setEfdNumber(sale.efdNumber);
    setPostedReceipt(sale.receiptNumber);
    void refreshInventory();

    addNotification({
      id: `pos-${sale.id}`,
      type: "success",
      title: "POS sale recorded",
      message: `${sale.receiptNumber} · ${formatTZS(total, true)} · ${paymentMethod.toUpperCase()}`,
      timestamp: stamp.toISOString(),
      read: false,
      link: "/pos/receipts",
    });

    setPaymentStatus("success");
    await new Promise((r) => setTimeout(r, 2400));
    setPaymentOpen(false);
    setPaymentStatus("idle");
    setCart([]);
    setCashGiven("");
    toast.success("Sale completed · EFD issued · receipt posted");
  }

  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-8 -my-6 min-h-[calc(100vh-4rem)] bg-ud-pos-bg dark-scrollbar grid lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px] text-white">
      {/* Product grid */}
      <main className="flex flex-col min-h-0 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display font-extrabold text-2xl">Point of Sale</h1>
            <p className="text-xs text-white/45">{company?.efdSerial || "EFD pending"} · Cashier: {session?.user?.name ?? ""}</p>
          </div>
          <div className="flex items-center gap-2">
            {branches.length > 0 && (
              <div className="relative">
                <Store className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  aria-label="Branch"
                  className="appearance-none pl-8 pr-7 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/85 focus:outline-none focus:ring-2 focus:ring-ud-primary cursor-pointer [&>option]:text-ud-text-primary"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-ud-success animate-pulse" />
              <span className="text-white/80">EFD connected · Online</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product or SKU…"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/5 text-sm placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-ud-primary"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4 sm:flex-nowrap sm:overflow-x-auto sm:dark-scrollbar sm:-mx-1 sm:px-1 sm:pb-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                c === category ? "bg-ud-primary text-white" : "bg-white/5 text-white/65 hover:text-white"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 overflow-y-auto flex-1 dark-scrollbar">
          {filtered.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => addToCart(item.id)}
              disabled={item.onHand === 0}
              className={cn(
                "p-3 rounded-2xl bg-white/5 border border-white/5 text-left hover:border-ud-primary-glow transition-colors",
                item.onHand === 0 && "opacity-40 cursor-not-allowed"
              )}
            >
              <div className="aspect-square rounded-xl bg-white/5 mb-2 flex items-center justify-center text-2xl">📦</div>
              <div className="text-sm font-medium text-white truncate">{item.name}</div>
              <div className="text-[10px] text-white/40 mt-0.5">{item.code} · {item.onHand} in stock</div>
              <div className="mt-2 font-mono font-bold text-ud-primary-glow text-sm">{formatTZS(item.sellingPrice)}</div>
            </motion.button>
          ))}
        </div>
      </main>

      {/* Cart */}
      <aside className="border-l border-white/5 flex flex-col bg-ud-pos-surface">
        <div className="px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-ud-primary-glow" />
            <span className="font-display font-bold">Current sale</span>
            <span className="ml-auto text-xs text-white/45">{cart.length} items</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto dark-scrollbar p-3">
          {cart.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 flex items-center justify-center mb-3">
                <ShoppingCart className="w-7 h-7 text-white/30" />
              </div>
              <p className="text-sm text-white/45">Tap a product to add it to the sale.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {cart.map((l) => (
                  <motion.div
                    key={l.itemId}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{l.name}</div>
                      <div className="text-xs text-white/45 font-mono">{formatTZS(l.unitPrice)}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => adjust(l.itemId, -1)}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-mono tabular-nums text-sm">{l.quantity}</span>
                      <button
                        onClick={() => adjust(l.itemId, 1)}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => setCart((p) => p.filter((x) => x.itemId !== l.itemId))}
                      className="ml-1 w-7 h-7 rounded-lg hover:bg-ud-danger/20 hover:text-ud-danger text-white/45 flex items-center justify-center"
                      aria-label="Remove item"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="border-t border-white/5 px-5 py-4 space-y-1.5">
          <Row label="Subtotal" value={formatTZS(subtotal)} />
          <Row label="VAT (18%)" value={formatTZS(vat)} muted />
          <div className="h-px bg-white/5 my-2" />
          <Row label="Total" value={formatTZS(total)} bold />
          <button
            onClick={() => setPaymentOpen(true)}
            disabled={cart.length === 0}
            className="w-full mt-3 py-3.5 rounded-xl gradient-teal font-display font-bold text-base text-white hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-gold-glow"
          >
            Pay {formatTZS(total)}
          </button>
        </div>
      </aside>

      {/* Payment modal */}
      <AnimatePresence>
        {paymentOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => paymentStatus === "idle" && setPaymentOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-ud-pos-surface border border-white/10 rounded-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {paymentStatus === "success" ? (
                <div className="text-center py-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 280, damping: 18 }}
                    className="relative w-20 h-20 mx-auto rounded-full gradient-emerald flex items-center justify-center mb-4"
                  >
                    <CheckCircle2 className="w-10 h-10 text-white" />
                    <div className="absolute inset-0 rounded-full bg-ud-success-bg animate-radial-pulse" />
                  </motion.div>
                  <h2 className="font-display font-bold text-xl">Payment successful</h2>
                  <p className="text-sm text-white/55 mt-1">EFD receipt printing…</p>
                  <div className="mt-5 p-4 rounded-xl bg-white/5 text-left font-mono text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-white/45">EFD #</span><span>{efdNumber}</span></div>
                    <div className="flex justify-between"><span className="text-white/45">Total</span><span className="font-bold">{formatTZS(total)}</span></div>
                    <div className="flex justify-between"><span className="text-white/45">Method</span><span className="uppercase">{paymentMethod}</span></div>
                  </div>
                  {postedReceipt && (
                    <Link
                      href="/pos/receipts"
                      className="mt-5 inline-flex items-center justify-center gap-1.5 w-full px-3 py-2.5 rounded-xl bg-ud-primary text-white text-sm font-medium hover:bg-ud-primary-hover transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      View receipts
                    </Link>
                  )}
                </div>
              ) : paymentStatus === "waiting" ? (
                <div className="text-center py-6">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                    className="w-20 h-20 mx-auto rounded-full gradient-teal flex items-center justify-center mb-4"
                  >
                    {paymentMethod === "mpesa" ? <Smartphone className="w-10 h-10 text-white" /> : <Banknote className="w-10 h-10 text-white" />}
                  </motion.div>
                  <h2 className="font-display font-bold text-xl">
                    {paymentMethod === "mpesa" ? "Waiting for M-Pesa confirmation…" : "Processing payment…"}
                  </h2>
                  <p className="text-sm text-white/55 mt-1">
                    {paymentMethod === "mpesa" ? `Push notification sent to ${phone}` : "Please wait"}
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="font-display font-bold text-xl mb-1">Complete payment</h2>
                  <p className="text-sm text-white/55 mb-5">Total: <span className="font-mono font-bold text-ud-primary-glow">{formatTZS(total)}</span></p>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {(["mpesa", "cash", "card"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setPaymentMethod(m)}
                        className={cn(
                          "py-3 rounded-xl text-sm font-medium uppercase transition-colors",
                          paymentMethod === m
                            ? "bg-ud-primary text-white"
                            : "bg-white/5 text-white/65 hover:text-white"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  {paymentMethod === "mpesa" && (
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Customer phone (+255 …)"
                      className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-ud-primary mb-3"
                    />
                  )}
                  {paymentMethod === "cash" && (
                    <>
                      <input
                        value={cashGiven}
                        onChange={(e) => setCashGiven(e.target.value.replace(/\D/g, ""))}
                        type="text"
                        inputMode="numeric"
                        placeholder="Cash received"
                        className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-ud-primary mb-3 font-mono"
                      />
                      {cashGiven && Number(cashGiven) >= total && (
                        <div className="p-3 rounded-xl bg-ud-success-bg/10 text-ud-success-bg text-sm flex justify-between mb-3">
                          <span>Change due</span>
                          <span className="font-mono font-bold text-ud-primary-glow">{formatAmount(Number(cashGiven) - total)} TSh</span>
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaymentOpen(false)}
                      className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={processPayment}
                      disabled={paymentMethod === "cash" && Number(cashGiven) < total}
                      className="flex-1 py-3 rounded-xl gradient-teal text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Charge {formatTZS(total)}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className={muted ? "text-white/45" : "text-white/75"}>{label}</span>
      <span className={cn("font-mono tabular-nums", bold ? "font-bold text-base text-ud-primary-glow" : muted ? "text-white/55" : "")}>{value}</span>
    </div>
  );
}
