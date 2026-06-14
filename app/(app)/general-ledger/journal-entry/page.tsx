"use client";
import { useEffect, useId, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Save, Pencil } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useCOA } from "@/lib/hooks/useCOA";
import { useGL } from "@/lib/hooks/useGL";
import { formatTZS } from "@/lib/utils/currency";
import toast from "react-hot-toast";
import type { JournalEntryLine } from "@/types";

export default function JournalEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editRef = searchParams.get("ref");
  const { accounts } = useCOA();
  const { glEntries, postJournalEntry, editJournalEntry } = useGL();
  const accountOptions = accounts
    .filter((a) => a.level >= 1)
    .map((a) => ({ value: a.code, label: `${a.code} ${a.name}` }));
  const uid = useId();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]!);
  // Derive a stable reference from useId no Math.random in render
  const initialRef = `JV-${new Date().getFullYear()}-${uid.replace(/[^0-9]/g, "").padStart(5, "0").slice(-5)}`;
  const [reference, setReference] = useState(editRef ?? initialRef);
  const [narration, setNarration] = useState("");
  const [shake, setShake] = useState(false);
  const [lines, setLines] = useState<JournalEntryLine[]>([
    { id: "1", accountCode: "", accountName: "", description: "", debit: 0, credit: 0 },
    { id: "2", accountCode: "", accountName: "", description: "", debit: 0, credit: 0 },
  ]);
  const isEdit = editRef !== null;

  useEffect(() => {
    if (!editRef) return;
    const matched = glEntries.filter((e) => e.reference === editRef);
    if (matched.length === 0) return;
    setReference(editRef);
    setNarration(matched[0]?.narration ?? "");
    setDate(matched[0]?.date ?? new Date().toISOString().split("T")[0]!);
    setLines(matched.map((m, i) => ({
      id: `e_${i}`,
      accountCode: m.accountCode,
      accountName: m.account,
      description: "",
      debit: m.debit,
      credit: m.credit,
    })));
    // run once on mount with editRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editRef]);

  function updateLine(id: string, patch: Partial<JournalEntryLine>) {
    setLines((prev) => prev.map((l) => {
      if (l.id !== id) return l;
      const updated = { ...l, ...patch };
      if (patch.accountCode) {
        const acc = accounts.find((a) => a.code === patch.accountCode);
        updated.accountName = acc?.name ?? "";
      }
      return updated;
    }));
  }

  function addLine() {
    setLines((prev) => [...prev, { id: String(Date.now()), accountCode: "", accountName: "", description: "", debit: 0, credit: 0 }]);
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  const totalDebit  = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const balanced = totalDebit === totalCredit && totalDebit > 0;

  async function save() {
    if (!balanced) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      toast.error("Debits must equal credits");
      return;
    }
    const validLines = lines.filter((l) => l.accountCode && (l.debit > 0 || l.credit > 0));
    if (validLines.length < 2) {
      toast.error("Need at least 2 valid lines");
      return;
    }
    const payload = { reference, narration: narration || "Manual journal entry", date, lines: validLines };
    const res = isEdit ? await editJournalEntry(payload) : await postJournalEntry(payload);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      isEdit
        ? "Journal entry updated · bank balances auto-adjusted"
        : "Journal entry posted · bank balances auto-adjusted",
    );
    router.push("/general-ledger");
  }

  return (
    <PageWrapper>
      <PageHeader
        title={isEdit ? "Edit Journal Entry" : "New Journal Entry"}
        subtitle={isEdit ? `Editing ${reference} debits must equal credits. Bank-side balances update automatically.` : "Record a manual journal debits must equal credits. Entries on bank accounts update bank balances automatically."}
        breadcrumbs={[{ label: "General Ledger", href: "/general-ledger" }, { label: isEdit ? "Edit Entry" : "New Entry" }]}
      />

      <div className="bg-white border border-ud-border rounded-2xl p-6 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} />
          <Input label="Narration" value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="Description of entry" />
        </div>

        <motion.div animate={shake ? { x: [-10, 10, -10, 10, 0] } : { x: 0 }} transition={{ duration: 0.4 }}>
          <div className="overflow-x-auto rounded-xl border border-ud-border">
            <table className="w-full text-sm">
              <thead className="bg-ud-surface-2 text-xs uppercase tracking-[0.06em] text-ud-text-secondary">
                <tr>
                  <th className="text-left px-3 py-2.5 w-1/3" scope="col">Account</th>
                  <th className="text-left px-3 py-2.5" scope="col">Description</th>
                  <th className="text-right px-3 py-2.5 w-32" scope="col">Debit</th>
                  <th className="text-right px-3 py-2.5 w-32" scope="col">Credit</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {lines.map((line) => (
                    <motion.tr
                      key={line.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-t border-ud-border"
                    >
                      <td className="px-3 py-2">
                        <Select
                          value={line.accountCode}
                          onValueChange={(v) => updateLine(line.id, { accountCode: v })}
                          options={accountOptions}
                          placeholder="Select account…"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input value={line.description} onChange={(e) => updateLine(line.id, { description: e.target.value })} placeholder="Optional" />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          value={line.debit || ""}
                          onChange={(e) => updateLine(line.id, { debit: Number(e.target.value) || 0, credit: 0 })}
                          className="text-right font-mono"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          value={line.credit || ""}
                          onChange={(e) => updateLine(line.id, { credit: Number(e.target.value) || 0, debit: 0 })}
                          className="text-right font-mono"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        {lines.length > 2 && (
                          <button onClick={() => removeLine(line.id)} className="p-1.5 rounded-lg hover:bg-ud-danger-bg text-ud-danger" aria-label="Remove line">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
              <tfoot>
                <tr className={balanced ? "bg-ud-success-bg" : "bg-ud-warning-bg"}>
                  <td colSpan={2} className="px-3 py-3 font-bold">
                    {balanced ? "✓ Balanced" : "⚠ Difference: " + formatTZS(Math.abs(totalDebit - totalCredit))}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold">{totalDebit.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right font-mono font-bold">{totalCredit.toLocaleString()}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </motion.div>

        <div className="mt-4 flex items-center justify-between">
          <Button variant="ghost" onClick={addLine} icon={<Plus className="w-4 h-4" />}>Add line</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button variant="primary" onClick={() => void save()} icon={isEdit ? <Pencil className="w-4 h-4" /> : <Save className="w-4 h-4" />}>{isEdit ? "Update entry" : "Post entry"}</Button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
