"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Car, Computer, Building, Sofa, Wrench, TrendingDown, AlertTriangle, Plus } from "lucide-react";
import toast from "react-hot-toast";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatCard } from "@/components/ui/StatCard";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatRowSkeleton } from "@/components/skeletons/StatRowSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { useFixedAssets } from "@/lib/hooks/useFixedAssets";
import { STANDARD_RATES } from "@/lib/utils/depreciation-rates";
import { formatTZS } from "@/lib/utils/currency";
import type { FixedAsset, AssetCategory, DepreciationMethod } from "@/types";

const CAT_ICON: Record<AssetCategory, React.ElementType> = {
  Vehicle: Car, Computer, Building, Furniture: Sofa, Equipment: Wrench,
};
const CAT_COLOR: Record<AssetCategory, "teal" | "info" | "warning" | "gold" | "default"> = {
  Vehicle: "info", Computer: "teal", Building: "warning", Furniture: "gold", Equipment: "default",
};

interface AddForm {
  code: string;
  name: string;
  category: AssetCategory;
  location: string;
  acquisitionDate: string;
  cost: number;
  residualValue: number;
  usefulLifeYears: number;
  depreciationMethod: DepreciationMethod;
}

function emptyAddForm(): AddForm {
  return {
    code: "", name: "", category: "Equipment", location: "DSM-Main",
    acquisitionDate: new Date().toISOString().split("T")[0]!,
    cost: 0, residualValue: 0, usefulLifeYears: 5, depreciationMethod: "StraightLine",
  };
}

export default function FixedAssetsPage() {
  const { assets, addAsset, disposeAsset, loading: assetsLoading } = useFixedAssets();
  const loading = assetsLoading;

  const [disposeTarget, setDisposeTarget] = useState<FixedAsset | null>(null);
  const [proceeds, setProceeds] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(emptyAddForm());

  async function saveAsset() {
    if (!addForm.name.trim()) {
      toast.error("Asset name is required");
      return;
    }
    if (addForm.cost <= 0) {
      toast.error("Cost must be greater than zero");
      return;
    }
    const code = addForm.code.trim() || `${addForm.category.slice(0, 3).toUpperCase()}-${String(Date.now()).slice(-4)}`;
    const newAsset: FixedAsset = {
      id: `fa_new_${Date.now()}`,
      code,
      name: addForm.name.trim(),
      category: addForm.category,
      location: addForm.location,
      acquisitionDate: addForm.acquisitionDate,
      cost: addForm.cost,
      residualValue: addForm.residualValue,
      usefulLifeYears: addForm.usefulLifeYears,
      depreciationMethod: addForm.depreciationMethod,
      accumulatedDepreciation: 0,
      netBookValue: addForm.cost,
      status: "Active",
    };
    const res = await addAsset(newAsset);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Added ${res.data.name}`);
    setAddOpen(false);
    setAddForm(emptyAddForm());
  }

  function applyCategoryDefaults(cat: AssetCategory) {
    const rate = STANDARD_RATES[cat];
    setAddForm((f) => ({ ...f, category: cat, usefulLifeYears: rate.usefulLife }));
  }

  const totals = useMemo(() => ({
    cost: assets.reduce((s, a) => s + a.cost, 0),
    nbv:  assets.reduce((s, a) => s + a.netBookValue, 0),
    dep:  assets.reduce((s, a) => s + a.accumulatedDepreciation, 0),
    active: assets.filter((a) => a.status === "Active").length,
  }), [assets]);

  const cols: Column<FixedAsset>[] = [
    { key: "code", label: "Code", className: "font-mono text-xs", width: "90px" },
    { key: "name", label: "Asset", render: (r) => {
      const Icon = CAT_ICON[r.category];
      return <div className="flex items-center gap-2"><Icon className="w-4 h-4 text-ud-text-muted" /><span className="font-medium">{r.name}</span></div>;
    } },
    { key: "category", label: "Category", render: (r) => <Badge variant={CAT_COLOR[r.category]} size="sm">{r.category}</Badge> },
    { key: "cost", label: "Cost", sortable: true, align: "right", render: (r) => <CurrencyDisplay amount={r.cost} showSymbol={false} /> },
    { key: "accumulatedDepreciation", label: "Accum. dep.", align: "right", render: (r) => <CurrencyDisplay amount={r.accumulatedDepreciation} showSymbol={false} className="text-ud-danger" /> },
    { key: "netBookValue", label: "NBV", sortable: true, align: "right", render: (r) => <CurrencyDisplay amount={r.netBookValue} showSymbol={false} className="font-bold" /> },
    { key: "status", label: "Status", render: (r) => (
      <div className="flex flex-col gap-0.5">
        <Badge variant={r.status === "Active" ? "success" : r.status === "Disposed" ? "default" : "warning"}>{r.status}</Badge>
        {r.status === "Disposed" && r.gainLoss !== undefined && (
          <span className={`text-[10px] font-mono ${r.gainLoss >= 0 ? "text-ud-success" : "text-ud-danger"}`}>
            {r.gainLoss >= 0 ? "Gain" : "Loss"}: {formatTZS(Math.abs(r.gainLoss), true)}
          </span>
        )}
      </div>
    ) },
    { key: "actions", label: "", align: "right", render: (r) => (
      r.status === "Active"
        ? <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setDisposeTarget(r); setProceeds(""); }}>Dispose</Button>
        : <span className="text-xs text-ud-text-faint">—</span>
    ) },
  ];

  const nbv = disposeTarget ? disposeTarget.cost - disposeTarget.accumulatedDepreciation : 0;
  const proceedsNum = Number(proceeds.replace(/[, ]/g, "")) || 0;
  const gainLoss = proceedsNum - nbv;

  async function confirmDispose() {
    if (!disposeTarget) return;
    if (proceedsNum <= 0) {
      toast.error("Enter disposal proceeds greater than zero");
      return;
    }
    const res = await disposeAsset(disposeTarget.id, proceedsNum, new Date().toISOString().split("T")[0]!);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    const gl = res.data.gainLoss;
    toast.success(
      gl >= 0
        ? `Asset disposed at a gain of ${formatTZS(gl, true)} — posted to GL`
        : `Asset disposed at a loss of ${formatTZS(Math.abs(gl), true)} — posted to GL`
    );
    setDisposeTarget(null);
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Fixed Assets"
        subtitle={`${assets.length} assets in the register`}
        actions={
          <>
            <Button variant="outline" icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>Add asset</Button>
            <Link href="/fixed-assets/depreciation"><Button variant="primary" icon={<TrendingDown className="w-4 h-4" />}>Depreciation schedule</Button></Link>
          </>
        }
      />

      {loading ? <StatRowSkeleton /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total cost"        value={totals.cost} variant="teal"  prefix="TSh" format="compact" />
          <StatCard label="Accum. depreciation" value={totals.dep}  variant="amber" prefix="TSh" format="compact" />
          <StatCard label="Net book value"    value={totals.nbv}  variant="emerald" prefix="TSh" format="compact" />
          <StatCard label="Active assets"      value={totals.active} variant="blue" format="raw" />
        </div>
      )}

      {loading ? <TableSkeleton rows={10} columns={7} /> :
        <DataTable data={assets} columns={cols} pageSize={15} initialSortKey="cost" rowKey={(r) => r.id} />
      }

      <Modal
        open={disposeTarget !== null}
        onOpenChange={(o) => !o && setDisposeTarget(null)}
        title={disposeTarget ? `Dispose: ${disposeTarget.name}` : ""}
        description="Record asset disposal, compute gain/loss, and update the register."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDisposeTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => void confirmDispose()}>Confirm disposal</Button>
          </>
        }
      >
        {disposeTarget && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-ud-surface-2">
                <div className="text-[10px] uppercase tracking-[0.08em] text-ud-text-muted">Cost</div>
                <div className="font-mono font-bold mt-1"><CurrencyDisplay amount={disposeTarget.cost} showSymbol={false} /></div>
              </div>
              <div className="p-3 rounded-xl bg-ud-surface-2">
                <div className="text-[10px] uppercase tracking-[0.08em] text-ud-text-muted">Accum. depreciation</div>
                <div className="font-mono font-bold mt-1 text-ud-danger"><CurrencyDisplay amount={disposeTarget.accumulatedDepreciation} showSymbol={false} /></div>
              </div>
              <div className="p-3 rounded-xl bg-ud-primary-50">
                <div className="text-[10px] uppercase tracking-[0.08em] text-ud-primary">Net book value</div>
                <div className="font-mono font-bold mt-1 text-ud-primary"><CurrencyDisplay amount={nbv} showSymbol={false} /></div>
              </div>
            </div>

            <Input
              label="Disposal proceeds (TZS)"
              type="text"
              inputMode="numeric"
              value={proceeds}
              onChange={(e) => setProceeds(e.target.value)}
              placeholder="0"
            />

            {proceedsNum > 0 && (
              <div className={`p-4 rounded-xl border ${gainLoss >= 0 ? "border-ud-success/30 bg-ud-success-bg" : "border-ud-danger/30 bg-ud-danger-bg"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.08em] font-semibold">{gainLoss >= 0 ? "Gain on disposal" : "Loss on disposal"}</span>
                  <Badge variant={gainLoss >= 0 ? "success" : "danger"}>
                    {gainLoss >= 0 ? "+" : "−"} <CurrencyDisplay amount={Math.abs(gainLoss)} showSymbol={false} />
                  </Badge>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 p-3 rounded-xl bg-ud-warning-bg/60 text-xs text-ud-text-secondary leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-ud-warning flex-shrink-0 mt-0.5" />
              <span>
                Capital gains realised on disposal of fixed assets are subject to{" "}
                <span className="font-semibold text-ud-text-primary">Capital Gains Tax</span> under the Tanzania Income Tax Act. The
                gain or loss above is for accounting purposes — consult your tax advisor regarding the tax treatment.
              </span>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add fixed asset"
        description="Add a new asset to the register. Useful life defaults from the standard rates for the chosen class."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => void saveAsset()}>Add asset</Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input  label="Asset code (auto if blank)" value={addForm.code} onChange={(e) => setAddForm({ ...addForm, code: e.target.value })} />
            <Input  label="Asset name"                 value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} />
            <Select label="Category" value={addForm.category} onValueChange={(v) => applyCategoryDefaults(v as AssetCategory)} options={[
              { value: "Building",  label: "Building"  },
              { value: "Vehicle",   label: "Vehicle"   },
              { value: "Equipment", label: "Equipment" },
              { value: "Computer",  label: "Computer"  },
              { value: "Furniture", label: "Furniture" },
            ]} />
            <Select label="Depreciation method" value={addForm.depreciationMethod} onValueChange={(v) => setAddForm({ ...addForm, depreciationMethod: v as DepreciationMethod })} options={[
              { value: "StraightLine",     label: "Straight Line"     },
              { value: "ReducingBalance",  label: "Reducing Balance"  },
            ]} />
            <Input  label="Location"           value={addForm.location} onChange={(e) => setAddForm({ ...addForm, location: e.target.value })} />
            <Input  label="Acquisition date"   type="date" value={addForm.acquisitionDate} onChange={(e) => setAddForm({ ...addForm, acquisitionDate: e.target.value })} />
            <Input  label="Cost (TZS)"           type="number" value={String(addForm.cost)}          onChange={(e) => setAddForm({ ...addForm, cost: Number(e.target.value) || 0 })} />
            <Input  label="Residual value (TZS)" type="number" value={String(addForm.residualValue)} onChange={(e) => setAddForm({ ...addForm, residualValue: Number(e.target.value) || 0 })} />
            <Input  label="Useful life (years)"  type="number" value={String(addForm.usefulLifeYears)} onChange={(e) => setAddForm({ ...addForm, usefulLifeYears: Number(e.target.value) || 1 })} />
          </div>
          <div className="text-xs text-ud-text-muted">
            Standard rate for {addForm.category}: <span className="font-mono">{(STANDARD_RATES[addForm.category].slPct * 100).toFixed(1)}% SL</span> · <span className="font-mono">{(STANDARD_RATES[addForm.category].rbPct * 100).toFixed(1)}% RB</span> · useful life {STANDARD_RATES[addForm.category].usefulLife} yr ({STANDARD_RATES[addForm.category].basis}).
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
