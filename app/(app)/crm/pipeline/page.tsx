"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, GripVertical } from "lucide-react";
import toast from "react-hot-toast";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { useSession } from "next-auth/react";
import { usePipelineDeals } from "@/lib/hooks/usePipelineDeals";
import type { PipelineDeal, DealStage } from "@/types";
import { cn } from "@/lib/utils/cn";

const STAGES: { key: DealStage; label: string; color: string }[] = [
  { key: "Lead",        label: "Lead",        color: "bg-slate-400" },
  { key: "Qualified",   label: "Qualified",   color: "bg-ud-primary" },
  { key: "Proposal",    label: "Proposal",    color: "bg-ud-primary-light" },
  { key: "Negotiation", label: "Negotiation", color: "bg-ud-gold" },
  { key: "Won",         label: "Won",         color: "bg-ud-success" },
];

interface FormState {
  dealName: string;
  companyName: string;
  contactName: string;
  value: number;
  probability: number;
  stage: DealStage;
  expectedCloseDate: string;
  notes: string;
}

function emptyForm(): FormState {
  const future = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]!;
  return {
    dealName: "",
    companyName: "",
    contactName: "",
    value: 0,
    probability: 50,
    stage: "Lead",
    expectedCloseDate: future,
    notes: "",
  };
}

export default function PipelinePage() {
  const { deals, loading: dataLoading, addDeal, moveDeal: moveDealAction } = usePipelineDeals();
  const { data: session } = useSession();
  const loading = dataLoading;
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  function moveDeal(dealId: string, newStage: DealStage) {
    void moveDealAction(dealId, newStage);
    toast.success(`Moved to ${newStage}`);
  }

  async function save() {
    if (!form.dealName.trim() || !form.companyName.trim()) {
      toast.error("Deal name and company are required");
      return;
    }
    const initials = form.contactName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "EM";
    const deal: PipelineDeal = {
      id: `deal_${Date.now()}`,
      dealName: form.dealName.trim(),
      companyName: form.companyName.trim(),
      contactName: form.contactName,
      value: form.value,
      probability: form.probability,
      stage: form.stage,
      assignedTo: session?.user?.name ?? "",
      assignedInitials: initials,
      expectedCloseDate: form.expectedCloseDate,
      daysInStage: 0,
      notes: form.notes,
    };
    const r = await addDeal(deal);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success(`Added ${deal.dealName}`);
    setAddOpen(false);
    setForm(emptyForm());
  }

  if (loading) {
    return <PageWrapper><PageHeader title="Sales Pipeline" /><CardGridSkeleton count={5} cols={3} /></PageWrapper>;
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Sales Pipeline"
        subtitle="Move deals between stages total value across active stages"
        breadcrumbs={[{ label: "CRM", href: "/crm" }, { label: "Pipeline" }]}
        actions={<Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Add deal</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 min-h-[500px]">
        {STAGES.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage.key);
          const total = stageDeals.reduce((s, d) => s + d.value, 0);
          return (
            <div key={stage.key} className="bg-ud-surface-2 rounded-2xl p-3 flex flex-col min-w-0">
              <div className="mb-3 px-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("w-2 h-2 rounded-full", stage.color)} />
                  <span className="font-display font-bold text-sm">{stage.label}</span>
                  <span className="ml-auto text-xs text-ud-text-muted">{stageDeals.length}</span>
                </div>
                <CurrencyDisplay amount={total} compact className="font-mono text-xs text-ud-text-muted" />
              </div>
              <div className="space-y-2 overflow-y-auto flex-1">
                {stageDeals.map((d) => (
                  <motion.div
                    key={d.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -2 }}
                    className="bg-white border border-ud-border rounded-xl p-3 shadow-sm cursor-grab hover:shadow-card-hover transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="text-sm font-medium leading-tight line-clamp-2">{d.dealName}</div>
                      <GripVertical className="w-3 h-3 text-ud-text-faint flex-shrink-0 mt-0.5" />
                    </div>
                    <div className="text-xs text-ud-text-muted truncate mb-2">{d.companyName}</div>
                    <CurrencyDisplay amount={d.value} compact className="font-bold text-ud-primary text-sm" />
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <Avatar initials={d.assignedInitials} size="xs" />
                      <span className="text-ud-text-muted">{d.daysInStage}d</span>
                      <span className="ml-auto font-mono tabular-nums text-ud-text-muted">{d.probability}%</span>
                    </div>
                    <div className="mt-2 flex gap-1">
                      {STAGES.filter((s) => s.key !== stage.key).slice(0, 3).map((s) => (
                        <button
                          key={s.key}
                          onClick={() => moveDeal(d.id, s.key)}
                          className="flex-1 text-[10px] py-1 rounded-md bg-ud-surface-2 hover:bg-ud-primary-50 hover:text-ud-primary transition-colors truncate"
                          title={`Move to ${s.label}`}
                        >
                          → {s.label.slice(0, 4)}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add deal"
        description="Add a new opportunity to the pipeline."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => void save()}>Add deal</Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <Input label="Deal name" value={form.dealName} onChange={(e) => setForm({ ...form, dealName: e.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Company"      value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            <Input label="Contact"      value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            <Input label="Value (TZS)" type="number" value={String(form.value)} onChange={(e) => setForm({ ...form, value: Number(e.target.value) || 0 })} />
            <Input label="Probability (%)" type="number" value={String(form.probability)} onChange={(e) => setForm({ ...form, probability: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} />
            <Select label="Stage" value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v as DealStage })} options={STAGES.map((s) => ({ value: s.key, label: s.label }))} />
            <Input label="Expected close" type="date" value={form.expectedCloseDate} onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })} />
          </div>
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
        </div>
      </Modal>
    </PageWrapper>
  );
}
