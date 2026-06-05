"use client";
import { useState } from "react";
import Link from "next/link";
import { BarChart3, Plus } from "lucide-react";
import toast from "react-hot-toast";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { useBudgetLines } from "@/lib/hooks/useBudgetLines";
import type { BudgetLine } from "@/types";

interface FormState {
  lineItem: string;
  category: string;
  annualBudget: number;
  ytdActual: number;
}

function emptyForm(): FormState {
  return { lineItem: "", category: "Operations", annualBudget: 0, ytdActual: 0 };
}

export default function BudgetingPage() {
  const { budgetLines, loading: dataLoading, addBudgetLine } = useBudgetLines();
  const loading = dataLoading;
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const existingCategories = Array.from(new Set(budgetLines.map((b) => b.category))).sort();

  async function save() {
    if (!form.lineItem.trim()) {
      toast.error("Line item is required");
      return;
    }
    if (form.annualBudget <= 0) {
      toast.error("Annual budget must be greater than zero");
      return;
    }
    const monthly = form.annualBudget / 12;
    const ytdBudget = monthly * 10; // assume Oct (10 months)
    const line: BudgetLine = {
      id: `b_new_${Date.now()}`,
      lineItem: form.lineItem.trim(),
      category: form.category,
      annualBudget: form.annualBudget,
      mtdBudget: monthly,
      mtdActual: form.ytdActual / 10,
      mtdVariance: monthly - form.ytdActual / 10,
      ytdBudget,
      ytdActual: form.ytdActual,
      ytdVariance: ytdBudget - form.ytdActual,
    };
    const r = await addBudgetLine(line);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success(`Added ${line.lineItem}`);
    setAddOpen(false);
    setForm(emptyForm());
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Budgeting"
        subtitle="Annual budget · YTD utilization by line item"
        actions={
          <>
            <Button variant="outline" icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Add budget line</Button>
            <Link href="/budgeting/budget-vs-actual"><Button variant="primary" icon={<BarChart3 className="w-4 h-4" />}>Variance analysis</Button></Link>
          </>
        }
      />

      {loading ? <CardGridSkeleton count={12} cols={3} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgetLines.map((b) => {
            const util = (b.ytdActual / b.ytdBudget) * 100;
            const overspent = util > 100;
            const variant = overspent ? "danger" : util > 90 ? "warning" : "teal";
            return (
              <div key={b.id} className="bg-white border border-ud-border rounded-2xl p-4 shadow-card">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-sm">{b.lineItem}</div>
                    <div className="text-xs text-ud-text-muted">{b.category}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-mono font-bold ${overspent ? "text-ud-danger" : ""}`}>{util.toFixed(0)}%</div>
                  </div>
                </div>
                <ProgressBar value={Math.min(util, 100)} variant={variant} />
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-ud-text-muted">YTD actual</div>
                    <CurrencyDisplay amount={b.ytdActual} compact className="font-medium" />
                  </div>
                  <div>
                    <div className="text-ud-text-muted">YTD budget</div>
                    <CurrencyDisplay amount={b.ytdBudget} compact className="font-medium" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add budget line"
        description="Add a budget line. YTD actual is optional — leave at zero if you haven't spent against it yet."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => void save()}>Add line</Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <Input label="Line item" value={form.lineItem} onChange={(e) => setForm({ ...form, lineItem: e.target.value })} placeholder="e.g. Office supplies" />
          <Select
            label="Category"
            value={form.category}
            onValueChange={(v) => setForm({ ...form, category: v })}
            options={[
              { value: "Personnel",   label: "Personnel" },
              { value: "Facilities",  label: "Facilities" },
              { value: "Operations",  label: "Operations" },
              { value: "Sales",       label: "Sales" },
              { value: "Finance",     label: "Finance" },
              { value: "Compliance",  label: "Compliance" },
              { value: "Capex",       label: "Capex" },
            ].concat(existingCategories.filter((c) => !["Personnel","Facilities","Operations","Sales","Finance","Compliance","Capex"].includes(c)).map((c) => ({ value: c, label: c })))}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Annual budget (TZS)" type="number" value={String(form.annualBudget)} onChange={(e) => setForm({ ...form, annualBudget: Number(e.target.value) || 0 })} />
            <Input label="YTD actual (TZS)"    type="number" value={String(form.ytdActual)}    onChange={(e) => setForm({ ...form, ytdActual: Number(e.target.value) || 0 })} />
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
