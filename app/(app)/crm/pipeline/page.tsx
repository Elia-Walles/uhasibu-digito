"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, GripVertical } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { useLoadingSimulation } from "@/lib/hooks/useLoadingSimulation";
import { PIPELINE_DEALS } from "@/lib/mock-data/pipeline";
import type { PipelineDeal, DealStage } from "@/types";
import { cn } from "@/lib/utils/cn";
import toast from "react-hot-toast";

const STAGES: { key: DealStage; label: string; color: string }[] = [
  { key: "Lead",        label: "Lead",        color: "bg-slate-400" },
  { key: "Qualified",   label: "Qualified",   color: "bg-ud-primary" },
  { key: "Proposal",    label: "Proposal",    color: "bg-ud-primary-light" },
  { key: "Negotiation", label: "Negotiation", color: "bg-ud-gold" },
  { key: "Won",         label: "Won",         color: "bg-ud-success" },
];

export default function PipelinePage() {
  const loading = useLoadingSimulation(800);
  const [deals, setDeals] = useState<PipelineDeal[]>(PIPELINE_DEALS);

  function moveDeal(dealId: string, newStage: DealStage) {
    setDeals((prev) => prev.map((d) => d.id === dealId ? { ...d, stage: newStage, daysInStage: 0 } : d));
    toast.success(`Moved to ${newStage}`);
  }

  if (loading) {
    return <PageWrapper><PageHeader title="Sales Pipeline" /><CardGridSkeleton count={5} cols={3} /></PageWrapper>;
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Sales Pipeline"
        subtitle="Drag deals between stages — total value across active stages"
        breadcrumbs={[{ label: "CRM", href: "/crm" }, { label: "Pipeline" }]}
        actions={<Button variant="primary" icon={<Plus className="w-4 h-4" />}>Add deal</Button>}
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
    </PageWrapper>
  );
}
