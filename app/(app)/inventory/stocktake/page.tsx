"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, Check, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Steps } from "@/components/ui/Steps";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { useInventory } from "@/lib/hooks/useInventory";
import { useT } from "@/lib/hooks/useT";
import toast from "react-hot-toast";

const STEPS = [
  { label: "Setup",       description: "Location & date" },
  { label: "Count sheet", description: "Print or scan" },
  { label: "Enter counts", description: "Physical totals" },
  { label: "Review",      description: "Variances" },
  { label: "Post",        description: "Adjustments" },
];

export default function StocktakePage() {
  const t = useT();
  const router = useRouter();
  const { inventory, recordMovement } = useInventory();
  const [step, setStep] = useState(0);
  const [location, setLocation] = useState("DSM-Main");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [posting, setPosting] = useState(false);

  async function complete() {
    setPosting(true);
    try {
      let adjustments = 0;
      for (const [itemId, counted] of Object.entries(counts)) {
        const item = inventory.find((i) => i.id === itemId);
        if (!item) continue;
        const delta = counted - item.onHand;
        if (delta === 0) continue;
        const res = await recordMovement({
          itemId,
          type: "ADJUSTMENT",
          quantity: delta,
          unitCost: item.unitCost,
          narration: t("Stocktake adjustment @ {location}", { location }),
        });
        if (res.ok) adjustments += 1;
      }
      toast.success(
        adjustments === 1
          ? t("Stocktake posted · {n} adjustment applied", { n: adjustments })
          : t("Stocktake posted · {n} adjustments applied", { n: adjustments }),
      );
      router.push("/inventory/movements");
    } finally {
      setPosting(false);
    }
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Stocktake"
        subtitle="Physical inventory count and reconciliation"
        breadcrumbs={[{ label: "Inventory", href: "/inventory" }, { label: "Stocktake" }]}
      />
      <div className="bg-white border border-ud-border rounded-2xl p-6 mb-6 shadow-card">
        <Steps steps={STEPS.map((s) => ({ label: t(s.label), description: t(s.description) }))} current={step} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
          <div className="bg-white border border-ud-border rounded-2xl p-6 shadow-card">
            {step === 0 && (
              <div className="space-y-4 max-w-md">
                <h3 className="font-display font-bold text-lg">{t("Stocktake setup")}</h3>
                <Select label="Location" value={location} onValueChange={setLocation} options={[{ value: "DSM-Main", label: "DSM Main warehouse" }, { value: "DSM-Annex", label: "DSM Annex" }, { value: "Zanzibar", label: "Zanzibar branch" }, { value: "Mwanza", label: "Mwanza" }]} />
                <Input label="Count date" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
                <Input label="Counted by" defaultValue="Peter Msangi" />
              </div>
            )}
            {step === 1 && (
              <div className="space-y-3">
                <h3 className="font-display font-bold text-lg">{t("Count sheet")}</h3>
                <p className="text-sm text-ud-text-muted">{t("A printable count sheet has been generated for {n} items at {location}.", { n: inventory.filter((i) => i.location === location).length, location })}</p>
                <div className="p-4 rounded-xl bg-ud-primary-50 text-sm text-ud-primary border border-ud-primary-100">
                  <ClipboardList className="w-5 h-5 inline mr-2" />
                  {t("Print the count sheet, perform the physical count, then return here to enter totals.")}
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-3">
                <h3 className="font-display font-bold text-lg">{t("Enter counts")}</h3>
                <div className="overflow-x-auto rounded-xl border border-ud-border max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-ud-surface-2 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs uppercase tracking-[0.06em]" scope="col">{t("Item")}</th>
                        <th className="text-right px-3 py-2 text-xs uppercase tracking-[0.06em]" scope="col">{t("System qty")}</th>
                        <th className="text-right px-3 py-2 text-xs uppercase tracking-[0.06em] w-32" scope="col">{t("Counted")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.filter((i) => i.location === location).slice(0, 12).map((item, i) => (
                        <tr key={item.id} className={i % 2 === 1 ? "bg-ud-surface-2/50" : ""}>
                          <td className="px-3 py-2"><div className="font-medium">{item.name}</div><div className="text-xs text-ud-text-muted">{item.code}</div></td>
                          <td className="px-3 py-2 text-right font-mono">{item.onHand}</td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              value={counts[item.id] ?? ""}
                              onChange={(e) => setCounts({ ...counts, [item.id]: Number(e.target.value) || 0 })}
                              className="text-right font-mono"
                              placeholder="0"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-3">
                <h3 className="font-display font-bold text-lg">{t("Review variances")}</h3>
                <div className="p-4 rounded-xl bg-ud-warning-bg border border-ud-warning/20 text-sm text-ud-warning">
                  {t("3 items have variances. Review carefully before posting.")}
                </div>
                <p className="text-sm text-ud-text-muted">{t("Adjustments will be posted to the General Ledger as an inventory adjustment journal entry.")}</p>
              </div>
            )}
            {step === 4 && (
              <div className="text-center py-8">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 mx-auto rounded-full gradient-emerald flex items-center justify-center mb-4">
                  <Check className="w-10 h-10 text-white" />
                </motion.div>
                <h3 className="font-display font-bold text-xl">{t("Ready to post")}</h3>
                <p className="text-sm text-ud-text-muted mt-1">{t("All counts captured. Click below to post the stocktake.")}</p>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="flex justify-between mt-6">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}>{t("Back")}</Button>
        {step < 4 ? (
          <Button variant="primary" onClick={() => setStep(step + 1)}>{t("Continue")}<ChevronRight className="w-4 h-4" /></Button>
        ) : (
          <Button variant="primary" loading={posting} onClick={() => void complete()}>{t("Post stocktake")}</Button>
        )}
      </div>
    </PageWrapper>
  );
}
