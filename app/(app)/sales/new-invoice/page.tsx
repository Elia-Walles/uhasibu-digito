"use client";
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Save, Send, Mail, MessageCircle, Globe, Printer, UserPlus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { useCompany } from "@/lib/hooks/useCompany";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useInventory } from "@/lib/hooks/useInventory";
import { useInvoices } from "@/lib/hooks/useInvoices";
import { useT } from "@/lib/hooks/useT";
import { formatTZS } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import { computeInvoiceTotals, computeLineTotal, currencyToWords } from "@/lib/utils/invoice-totals";
import toast from "react-hot-toast";
import type { Customer, SendChannel } from "@/types";

type SendChoice = "Email" | "WhatsApp" | "Both" | "JustSave";

interface LineDraft {
  id: string;
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  vatPct: number;
}

function blankLine(): LineDraft {
  return { id: String(Date.now() + Math.floor(performance.now())), productId: "", description: "", quantity: 1, unitPrice: 0, discountPct: 0, vatPct: 18 };
}

function computeDueDate(issued: string): string {
  const d = new Date(issued);
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0]!;
}

function emptyCustomer(name: string, phone: string, email: string, tin: string): Customer {
  return {
    id: "", name, contactPerson: name, tin, phone, email, city: "", address: "",
    creditLimit: 0, outstandingBalance: 0, status: "Active", paymentTerms: "30 days", totalRevenue: 0,
  };
}

export default function NewInvoicePage() {
  const tr = useT();
  const router = useRouter();
  const editId = useSearchParams().get("id") ?? "";
  const { customers, createCustomer } = useCustomers();
  const { inventory } = useInventory();
  const { invoices, createInvoice, updateInvoiceFull, sendInvoice } = useInvoices();
  const { company } = useCompany();
  const today = new Date().toISOString().split("T")[0]!;

  const [customerId, setCustomerId] = useState("");
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(computeDueDate(today));
  const [notes, setNotes] = useState("Payment is due 30 days from invoice date. Bank: CRDB 0150123456789");
  const [lines, setLines] = useState<LineDraft[]>([blankLine()]);
  const [loadedEdit, setLoadedEdit] = useState(false);

  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendChoice, setSendChoice] = useState<SendChoice>("Email");
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // Quick-add customer
  const [custModalOpen, setCustModalOpen] = useState(false);
  const [newCust, setNewCust] = useState({ name: "", phone: "", email: "", tin: "" });
  const [addingCust, setAddingCust] = useState(false);

  useEffect(() => {
    if (!customerId && customers.length > 0) setCustomerId(customers[0]!.id);
  }, [customers, customerId]);

  // Load a draft for editing.
  useEffect(() => {
    if (!editId || loadedEdit) return;
    const inv = invoices.find((i) => i.id === editId);
    if (!inv) return;
    if (inv.status !== "Draft") {
      toast.error(tr("Only draft invoices can be edited"));
      router.push("/sales/invoices");
      return;
    }
    setCustomerId(inv.customerId);
    setIssueDate(inv.issueDate);
    setDueDate(inv.dueDate);
    setNotes(inv.notes);
    setLines(inv.lines.map((l) => ({ id: l.id, productId: "", description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, discountPct: l.discountPct, vatPct: l.vatPct })));
    setLoadedEdit(true);
  }, [editId, invoices, loadedEdit, router, tr]);

  const customer = customers.find((c) => c.id === customerId);
  const productOptions = useMemo(
    () => [{ value: "", label: tr("Custom / free text") }, ...inventory.map((i) => ({ value: i.id, label: `${i.name} — ${formatTZS(i.sellingPrice)}` }))],
    [inventory, tr],
  );

  function updateLine(id: string, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function selectProduct(id: string, productId: string) {
    const item = inventory.find((i) => i.id === productId);
    updateLine(id, item ? { productId, description: item.name, unitPrice: item.sellingPrice } : { productId });
  }
  function addLine() {
    setLines((prev) => [...prev, blankLine()]);
  }

  const totalsInput = lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice, discountPct: l.discountPct, vatPct: l.vatPct }));
  const { subtotal, vatAmount, total } = computeInvoiceTotals(totalsInput);

  const linesValid = lines.length > 0 && lines.every((l) => l.description.trim() && l.quantity > 0);

  function buildPayload(status: "Draft" | "Sent") {
    return {
      customerId: customer!.id,
      issueDate,
      dueDate,
      notes,
      status,
      lines: lines.map((l) => ({ description: l.description.trim(), quantity: l.quantity, unitPrice: l.unitPrice, discountPct: l.discountPct, vatPct: l.vatPct })),
    };
  }

  async function saveDraft() {
    if (!customer) return toast.error(tr("Select a customer"));
    if (!linesValid) return toast.error(tr("Add a description and quantity to every line"));
    setSavingDraft(true);
    try {
      const res = editId
        ? await updateInvoiceFull({ id: editId, customerId: customer.id, issueDate, dueDate, notes, lines: buildPayload("Draft").lines })
        : await createInvoice(buildPayload("Draft"));
      if (!res.ok) return toast.error(res.error);
      toast.success(tr("Invoice saved as draft"));
      router.push("/sales/invoices");
    } finally {
      setSavingDraft(false);
    }
  }

  function openSendModal() {
    if (!customer) return toast.error(tr("Select a customer"));
    if (!linesValid) return toast.error(tr("Add a description and quantity to every line"));
    setSendChoice("Email");
    setSendModalOpen(true);
  }

  async function confirmSend() {
    if (!customer) return;
    setSending(true);
    try {
      // Editing a draft: persist edits first, then issue via status change is out of this flow — we
      // create a fresh issued invoice (new invoices) or, when editing, save then mark sent.
      const created = await createInvoice(buildPayload("Sent"));
      if (!created.ok) return toast.error(created.error);
      if (sendChoice === "JustSave") {
        toast.success(tr("Invoice issued"));
        setSendModalOpen(false);
        router.push("/sales/invoices");
        return;
      }
      const channel: SendChannel = sendChoice === "Both" ? "Both" : sendChoice;
      const recipient = channel === "Email" ? customer.email : channel === "WhatsApp" ? customer.phone : `${customer.email} · ${customer.phone}`;
      const t = toast.loading(tr("Sending invoice via {channel}…", { channel }));
      const sent = await sendInvoice(created.data.id, channel, recipient);
      if (sent.ok) toast.success(tr("Delivered via {channel}", { channel }), { id: t });
      else toast.error(sent.error, { id: t });
      setSendModalOpen(false);
      router.push("/sales/sent-log");
    } finally {
      setSending(false);
    }
  }

  async function addCustomer() {
    if (!newCust.name.trim()) return toast.error(tr("Customer name is required"));
    setAddingCust(true);
    try {
      const res = await createCustomer(emptyCustomer(newCust.name.trim(), newCust.phone, newCust.email, newCust.tin));
      if (!res.ok) return toast.error(res.error);
      setCustomerId(res.data.id);
      setCustModalOpen(false);
      setNewCust({ name: "", phone: "", email: "", tin: "" });
      toast.success(tr("Customer added"));
    } finally {
      setAddingCust(false);
    }
  }

  return (
    <PageWrapper>
      <PageHeader
        title={editId ? "Edit Invoice" : "New Invoice"}
        subtitle="Live preview updates as you type"
        breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: editId ? "Edit Invoice" : "New Invoice" }]}
        actions={<Button variant="ghost" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>{tr("Print")}</Button>}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-4 no-print">
          <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card">
            <h3 className="font-display font-bold mb-4">{tr("Invoice details")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 flex items-end gap-2">
                <div className="flex-1">
                  <Select label="Customer" value={customerId} onValueChange={setCustomerId} options={customers.map((c) => ({ value: c.id, label: c.name }))} />
                </div>
                <Button variant="outline" icon={<UserPlus className="w-4 h-4" />} onClick={() => setCustModalOpen(true)}>{tr("New")}</Button>
              </div>
              <Input label={tr("Issue date")} type="date" value={issueDate} onChange={(e) => { setIssueDate(e.target.value); setDueDate(computeDueDate(e.target.value)); }} />
              <Input label={tr("Due date")} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card">
            <h3 className="font-display font-bold mb-3">{tr("Line items")}</h3>
            <div className="space-y-3">
              <AnimatePresence>
                {lines.map((l) => (
                  <motion.div key={l.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl bg-ud-surface-2 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <Select value={l.productId} onValueChange={(v) => selectProduct(l.id, v)} options={productOptions} placeholder={tr("Pick a product")} />
                      </div>
                      {lines.length > 1 && (
                        <button onClick={() => setLines((p) => p.filter((x) => x.id !== l.id))} className="p-1.5 rounded-lg hover:bg-ud-danger-bg text-ud-danger" aria-label={tr("Remove")}>
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <Input value={l.description} onChange={(e) => updateLine(l.id, { description: e.target.value })} placeholder={tr("Description")} />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Input label={tr("Qty")} type="number" value={String(l.quantity)} onChange={(e) => updateLine(l.id, { quantity: Number(e.target.value) || 0 })} className="text-right" />
                      <Input label={tr("Unit price")} type="number" value={String(l.unitPrice)} onChange={(e) => updateLine(l.id, { unitPrice: Number(e.target.value) || 0 })} className="text-right font-mono" />
                      <Input label={tr("Disc %")} type="number" value={String(l.discountPct)} onChange={(e) => updateLine(l.id, { discountPct: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} className="text-right" />
                      <Input label={tr("VAT %")} type="number" value={String(l.vatPct)} onChange={(e) => updateLine(l.id, { vatPct: Math.max(0, Number(e.target.value) || 0) })} className="text-right" />
                    </div>
                    <div className="text-right text-sm font-mono tabular-nums text-ud-text-secondary">{formatTZS(computeLineTotal(l))}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <button onClick={addLine} className="mt-3 inline-flex items-center gap-1.5 text-sm text-ud-primary font-medium hover:underline">
              <Plus className="w-3.5 h-3.5" />{tr("Add line")}
            </button>
          </div>

          <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card">
            <label className="block text-xs font-medium text-ud-text-secondary mb-1.5">{tr("Notes / terms")}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-xl border border-ud-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ud-primary" />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" loading={savingDraft} onClick={() => void saveDraft()} icon={<Save className="w-4 h-4" />}>{tr("Save draft")}</Button>
            {!editId && <Button variant="primary" onClick={openSendModal} icon={<Send className="w-4 h-4" />}>{tr("Save & send")}</Button>}
          </div>
        </div>

        {/* Live preview */}
        <div id="invoice-print" className="bg-white border border-ud-border rounded-2xl p-8 shadow-card overflow-auto">
          <div className="flex justify-between mb-8">
            <div>
              <Image src="/images/uhasibu-digito-circle.png" alt="Uhasibu Digito" width={48} height={48} className="w-12 h-12 rounded-xl mb-2" />
              <div className="font-display font-bold">{company?.shortName || company?.name || ""}</div>
              <div className="text-xs text-ud-text-muted">{company?.address ?? ""}</div>
              <div className="text-xs text-ud-text-muted">TIN: {company?.tin ?? ""} · VAT: {company?.vatNumber ?? ""}</div>
            </div>
            <div className="text-right">
              <h1 className="font-display font-extrabold text-3xl text-ud-primary">{tr("INVOICE")}</h1>
              <div className="text-xs text-ud-text-muted mt-1">{tr("PREVIEW")}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
            <div>
              <div className="uppercase tracking-[0.08em] text-ud-text-muted mb-1">{tr("Bill to")}</div>
              <div className="font-medium">{customer?.name}</div>
              <div className="text-ud-text-muted">{customer?.address}</div>
              <div className="text-ud-text-muted">TIN: {customer?.tin}</div>
            </div>
            <div className="text-right">
              <div className="uppercase tracking-[0.08em] text-ud-text-muted mb-1">{tr("Details")}</div>
              <div>{tr("Issued:")} {formatDate(issueDate)}</div>
              <div>{tr("Due:")} {formatDate(dueDate)}</div>
            </div>
          </div>

          <table className="w-full text-xs mb-6">
            <thead className="bg-ud-surface-2">
              <tr>
                <th className="text-left px-2.5 py-2 uppercase tracking-[0.06em]">{tr("Description")}</th>
                <th className="text-right px-2.5 py-2 uppercase tracking-[0.06em]">{tr("Qty")}</th>
                <th className="text-right px-2.5 py-2 uppercase tracking-[0.06em]">{tr("Unit")}</th>
                <th className="text-right px-2.5 py-2 uppercase tracking-[0.06em]">{tr("Total")}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} className="border-b border-ud-border">
                  <td className="px-2.5 py-2">{l.description || <span className="text-ud-text-faint">—</span>}</td>
                  <td className="px-2.5 py-2 text-right font-mono">{l.quantity}</td>
                  <td className="px-2.5 py-2 text-right font-mono">{l.unitPrice.toLocaleString()}</td>
                  <td className="px-2.5 py-2 text-right font-mono font-medium">{computeLineTotal(l).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto w-64 text-xs space-y-1.5">
            <div className="flex justify-between"><span className="text-ud-text-muted">{tr("Subtotal")}</span><span className="font-mono">{subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-ud-text-muted">{tr("VAT")}</span><span className="font-mono">{vatAmount.toLocaleString()}</span></div>
            <div className="flex justify-between font-bold pt-2 border-t border-ud-border"><span>{tr("Total (TZS)")}</span><span className="font-mono">{total.toLocaleString()}</span></div>
          </div>

          <div className="mt-4 text-[10px] text-ud-text-muted italic">{currencyToWords(total)}.</div>

          <div className="mt-6 pt-4 border-t border-ud-border text-[10px] text-ud-text-muted">
            <div className="font-medium text-ud-text-secondary mb-1">{tr("Notes")}</div>
            <div>{notes}</div>
            {customer?.isInternational && (
              <div className="mt-3 pt-3 border-t border-dashed border-ud-border">
                <div className="font-medium text-ud-text-secondary mb-1 inline-flex items-center gap-1">
                  <Globe className="w-3 h-3" />{tr("International payments")}
                </div>
                <div>{tr("Beneficiary bank:")} {customer.beneficiaryBank ?? "Stanbic Bank Tanzania"}</div>
                <div>{tr("SWIFT / BIC:")} <span className="font-mono">{customer.swiftBic ?? "SBICTZTX"}</span></div>
                {customer.iban && <div>IBAN: <span className="font-mono">{customer.iban}</span></div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick-add customer */}
      <Modal open={custModalOpen} onOpenChange={setCustModalOpen} title="New customer" size="sm"
        footer={<><Button variant="ghost" onClick={() => setCustModalOpen(false)}>{tr("Cancel")}</Button><Button variant="primary" loading={addingCust} onClick={() => void addCustomer()}>{tr("Add customer")}</Button></>}>
        <div className="space-y-3">
          <Input label={tr("Name")} value={newCust.name} onChange={(e) => setNewCust({ ...newCust, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={tr("Phone")} value={newCust.phone} onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })} />
            <Input label={tr("TIN")} value={newCust.tin} onChange={(e) => setNewCust({ ...newCust, tin: e.target.value })} />
          </div>
          <Input label={tr("Email")} value={newCust.email} onChange={(e) => setNewCust({ ...newCust, email: e.target.value })} />
        </div>
      </Modal>

      <Modal open={sendModalOpen} onOpenChange={setSendModalOpen} title="Send invoice" description={customer ? tr("To {name}", { name: customer.name }) : ""} size="md"
        footer={<><Button variant="ghost" onClick={() => setSendModalOpen(false)} disabled={sending}>{tr("Cancel")}</Button><Button variant="primary" onClick={() => { void confirmSend(); }} loading={sending} icon={<Send className="w-4 h-4" />}>{sendChoice === "JustSave" ? tr("Issue") : tr("Send")}</Button></>}>
        {customer && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ChannelOption icon={<Mail className="w-4 h-4" />} label={tr("Email")} detail={customer.email} active={sendChoice === "Email"} onClick={() => setSendChoice("Email")} />
              <ChannelOption icon={<MessageCircle className="w-4 h-4" />} label={tr("WhatsApp")} detail={customer.phone} active={sendChoice === "WhatsApp"} onClick={() => setSendChoice("WhatsApp")} />
              <ChannelOption icon={<Send className="w-4 h-4" />} label={tr("Both")} detail={tr("Email + WhatsApp")} active={sendChoice === "Both"} onClick={() => setSendChoice("Both")} />
              <ChannelOption icon={<Save className="w-4 h-4" />} label={tr("Just issue")} detail={tr("No send")} active={sendChoice === "JustSave"} onClick={() => setSendChoice("JustSave")} />
            </div>
            <div className="text-xs text-ud-text-muted">{tr("Issuing posts the invoice to your ledger (Dr Receivables, Cr Revenue + VAT). Email uses your SMTP server; every send is logged to")} <span className="text-ud-primary font-medium">{tr("Sales → Sent log")}</span>.</div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}

function ChannelOption({ icon, label, detail, active, onClick }: { icon: React.ReactNode; label: string; detail: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`text-left p-3 rounded-xl border transition-all min-h-[64px] ${active ? "border-ud-primary bg-ud-primary-50/60 shadow-sm" : "border-ud-border hover:border-ud-primary/40"}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className={active ? "text-ud-primary" : "text-ud-text-muted"}>{icon}</span>
        {label}
      </div>
      <div className="text-xs text-ud-text-muted mt-1 truncate">{detail}</div>
    </button>
  );
}
