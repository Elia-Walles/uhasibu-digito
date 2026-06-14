"use client";
import { useMemo, useState, useEffect } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { motion } from "framer-motion";
import { Download, TrendingUp, FileSpreadsheet, AlertTriangle } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { useDataStore } from "@/lib/store/dataStore";
import { useExports } from "@/lib/hooks/useExports";
import { getStatements, type PeriodView } from "@/lib/server/actions/statements";
import { formatTZS } from "@/lib/utils/currency";
import type { ModelScenario } from "@/types";
import toast from "react-hot-toast";

// The model's historical base is the company's real ledger (prior + current year). It is
// zero until transactions are recorded.
interface Hist {
  revenuePrior: number; revenueCurrent: number; cogsCurrent: number; opexCurrent: number;
  cashCurrent: number; equityCurrent: number; ppeCurrent: number; netPrior: number; netCurrent: number;
}
const ZERO_HIST: Hist = {
  revenuePrior: 0, revenueCurrent: 0, cogsCurrent: 0, opexCurrent: 0,
  cashCurrent: 0, equityCurrent: 0, ppeCurrent: 0, netPrior: 0, netCurrent: 0,
};

function histFromStatements(v: PeriodView): Hist {
  const is = (label: string) => v.incomeStatement.find((l) => l.label === label);
  const bs = (sub: string) => v.balanceSheet.find((l) => l.label.toLowerCase().includes(sub));
  return {
    revenuePrior: is("Revenue")?.prior ?? 0,
    revenueCurrent: is("Revenue")?.current ?? 0,
    cogsCurrent: is("Cost of sales")?.current ?? 0,
    opexCurrent: is("Operating expenses")?.current ?? 0,
    cashCurrent: bs("cash")?.current ?? 0,
    equityCurrent: v.balanceSheet.find((l) => l.label === "Total equity")?.current ?? 0,
    ppeCurrent: bs("property")?.current ?? 0,
    netPrior: is("Net profit")?.prior ?? 0,
    netCurrent: is("Net profit")?.current ?? 0,
  };
}

const SCENARIO_ADJ: Record<ModelScenario, { growth: number; margin: number }> = {
  Base:     { growth:  0,    margin:  0 },
  Upside:   { growth:  0.03, margin:  0.01 },
  Downside: { growth: -0.03, margin: -0.02 },
};

export default function FinancialModelingPage() {
  const assumptions = useDataStore((s) => s.modelAssumptions);
  const updateAssumptions = useDataStore((s) => s.updateAssumptions);
  const { exportModel } = useExports();
  const [hist, setHist] = useState<Hist>(ZERO_HIST);
  const baseYear = new Date().getFullYear();

  useEffect(() => {
    let active = true;
    void getStatements("FY").then((v) => {
      if (active) setHist(histFromStatements(v));
    });
    return () => { active = false; };
  }, []);

  const adj = SCENARIO_ADJ[assumptions.scenario];
  const effectiveGrowth = assumptions.revenueGrowth + adj.growth;
  const effectiveMargin = assumptions.grossMarginTarget + adj.margin;

  const projections = useMemo(() => {
    const years = [baseYear + 1, baseYear + 2, baseYear + 3];
    const data: {
      year: string;
      revenue: number;
      cogs: number;
      gross: number;
      opex: number;
      operating: number;
      tax: number;
      net: number;
      ppe: number;
      cash: number;
      equity: number;
    }[] = [];

    let prevRev = hist.revenueCurrent;
    let prevOpex = hist.opexCurrent;
    let prevCash = hist.cashCurrent;
    let prevEquity = hist.equityCurrent;
    let prevPpe = hist.ppeCurrent;

    for (const y of years) {
      const revenue = prevRev * (1 + effectiveGrowth);
      const cogs = revenue * (1 - effectiveMargin);
      const gross = revenue - cogs;
      const opex = prevOpex * (1 + assumptions.opexGrowth);
      const operating = gross - opex;
      const tax = Math.max(0, operating * assumptions.taxRate);
      const net = operating - tax;
      const ppe = prevPpe + assumptions.capexAnnual;
      const cash = prevCash + net - assumptions.capexAnnual;
      const equity = prevEquity + net;
      data.push({ year: `${y}F`, revenue, cogs, gross, opex, operating, tax, net, ppe, cash, equity });
      prevRev = revenue;
      prevOpex = opex;
      prevCash = cash;
      prevEquity = equity;
      prevPpe = ppe;
    }
    return data;
  }, [hist, effectiveGrowth, effectiveMargin, assumptions.opexGrowth, assumptions.capexAnnual, assumptions.taxRate]);

  const chartData = useMemo(() => ([
    { year: `${baseYear - 1}`, revenue: hist.revenuePrior,   profit: hist.netPrior },
    { year: `${baseYear}`,     revenue: hist.revenueCurrent, profit: hist.netCurrent },
    ...projections.map((p) => ({ year: p.year, revenue: p.revenue, profit: p.net })),
  ]), [projections, hist, baseYear]);

  const cagr = useMemo(() => {
    const last = projections[projections.length - 1];
    if (!last || hist.revenueCurrent <= 0) return 0;
    return Math.pow(last.revenue / hist.revenueCurrent, 1 / projections.length) - 1;
  }, [projections, hist]);

  async function handleExport() {
    try {
      await exportModel(assumptions);
      toast.success("Model workbook downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Excel export failed");
    }
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Financial Modeling"
        subtitle="Driver-based projections, scenarios, Excel export"
        actions={
          <Button variant="primary" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
            Export model to Excel
          </Button>
        }
      />

      <div className="mb-4 flex items-start gap-3 p-4 rounded-2xl border border-ud-warning/30 bg-ud-warning-bg">
        <AlertTriangle className="w-5 h-5 text-ud-warning flex-shrink-0 mt-0.5" />
        <div className="text-sm text-ud-text-secondary leading-relaxed">
          <Badge variant="warning" size="sm" className="mb-1">Model hygiene</Badge>
          <p>
            Exported workbook follows the standard layout: <span className="font-semibold text-ud-text-primary">Cover · Dashboard · Assumptions · Historicals · IS / BS / CF projections</span>.
            Inputs are <span className="font-semibold text-ud-info">blue</span>, formulas <span className="font-semibold text-ud-success">green</span>. No hard-coded values inside formulas every driver flows through Assumptions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Revenue CAGR (FY24→27)" value={cagr * 100} suffix="%" variant="teal" format="raw" />
        <StatCard label={`Revenue FY ${projections[projections.length - 1]?.year ?? ""}`}
                  value={projections[projections.length - 1]?.revenue ?? 0} prefix="TSh" variant="emerald" format="compact" />
        <StatCard label="Projected net profit" value={projections[projections.length - 1]?.net ?? 0} prefix="TSh" variant="amber" format="compact" />
        <StatCard label="Projected cash" value={projections[projections.length - 1]?.cash ?? 0} prefix="TSh" variant="blue" format="compact" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Assumptions panel */}
        <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-base">Assumptions</h3>
            <Badge variant="info" size="sm">{assumptions.scenario}</Badge>
          </div>

          <div className="mb-4">
            <div className="text-xs uppercase tracking-[0.08em] font-semibold text-ud-text-muted mb-2">Scenario</div>
            <div className="inline-flex items-center p-1 rounded-xl bg-ud-surface-2 border border-ud-border">
              {(["Base", "Upside", "Downside"] as ModelScenario[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => updateAssumptions({ scenario: s })}
                  className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px] ${
                    assumptions.scenario === s ? "text-white" : "text-ud-text-secondary"
                  }`}
                  aria-pressed={assumptions.scenario === s}
                >
                  {assumptions.scenario === s && (
                    <motion.span layoutId="model-scenario-pill" className="absolute inset-0 rounded-lg bg-ud-primary -z-0" transition={{ type: "spring", stiffness: 380, damping: 30 }} />
                  )}
                  <span className="relative z-10">{s}</span>
                </button>
              ))}
            </div>
            {adj.growth !== 0 && (
              <div className="mt-2 text-[11px] text-ud-text-muted">
                Scenario adjustment: growth {adj.growth > 0 ? "+" : ""}{(adj.growth * 100).toFixed(0)}pp · margin {adj.margin > 0 ? "+" : ""}{(adj.margin * 100).toFixed(0)}pp
              </div>
            )}
          </div>

          <div className="space-y-3">
            <PctInput label="Inflation"      value={assumptions.inflationRate} onChange={(v) => updateAssumptions({ inflationRate: v })} />
            <PctInput label="Revenue growth" value={assumptions.revenueGrowth} onChange={(v) => updateAssumptions({ revenueGrowth: v })} />
            <PctInput label="Gross margin"   value={assumptions.grossMarginTarget} onChange={(v) => updateAssumptions({ grossMarginTarget: v })} />
            <PctInput label="Opex growth"    value={assumptions.opexGrowth} onChange={(v) => updateAssumptions({ opexGrowth: v })} />
            <PctInput label="Tax rate"       value={assumptions.taxRate} onChange={(v) => updateAssumptions({ taxRate: v })} />
            <Input
              label="TZS / USD"
              type="number"
              value={String(assumptions.fxTzsPerUsd)}
              onChange={(e) => updateAssumptions({ fxTzsPerUsd: Number(e.target.value) || 0 })}
            />
            <Input
              label="CapEx (annual TZS)"
              type="number"
              value={String(assumptions.capexAnnual)}
              onChange={(e) => updateAssumptions({ capexAnnual: Number(e.target.value) || 0 })}
            />
            <Input
              label="Primary products"
              value={assumptions.primaryProducts}
              onChange={(e) => updateAssumptions({ primaryProducts: e.target.value })}
            />
          </div>
        </div>

        {/* Chart */}
        <div className="lg:col-span-2 bg-white border border-ud-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-base">Revenue & net profit historical + forecast</h3>
            <span className="text-xs text-ud-text-muted inline-flex items-center gap-1"><TrendingUp className="w-3 h-3" />Driven by assumptions</span>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5F0EC" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatTZS(Number(v), true).replace("TSh ", "")} />
              <Tooltip formatter={(v) => formatTZS(Number(v))} contentStyle={{ borderRadius: 12, border: "1px solid #E5F0EC", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#0F7B5E" strokeWidth={3} dot={{ r: 4 }} animationDuration={900} />
              <Line type="monotone" dataKey="profit"  name="Net profit" stroke="#F5C842" strokeWidth={3} dot={{ r: 4 }} animationDuration={900} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Projection tables */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ProjectionTable title="Income Statement" rows={[
          { label: "Revenue",            values: projections.map((p) => p.revenue) },
          { label: "Cost of sales",      values: projections.map((p) => -p.cogs) },
          { label: "Gross profit",       values: projections.map((p) => p.gross), total: true },
          { label: "Operating expenses", values: projections.map((p) => -p.opex) },
          { label: "Operating profit",   values: projections.map((p) => p.operating), total: true },
          { label: "Income tax",         values: projections.map((p) => -p.tax) },
          { label: "Net profit",         values: projections.map((p) => p.net), total: true },
        ]} years={projections.map((p) => p.year)} />
        <ProjectionTable title="Balance Sheet (extract)" rows={[
          { label: "PPE (net)",     values: projections.map((p) => p.ppe) },
          { label: "Cash & bank",   values: projections.map((p) => p.cash) },
          { label: "Total equity",  values: projections.map((p) => p.equity), total: true },
        ]} years={projections.map((p) => p.year)} />
        <ProjectionTable title="Cash Flow (extract)" rows={[
          { label: "Net profit",        values: projections.map((p) => p.net) },
          { label: "Less: CapEx",       values: projections.map((p) => -assumptions.capexAnnual) },
          { label: "Net change in cash", values: projections.map((p) => p.net - assumptions.capexAnnual), total: true },
        ]} years={projections.map((p) => p.year)} />
      </div>

      <div className="mt-6 flex items-center gap-2 p-4 rounded-2xl bg-ud-primary-50 border border-ud-primary-100">
        <FileSpreadsheet className="w-5 h-5 text-ud-primary" />
        <div className="text-sm text-ud-text-secondary">
          Need the full workbook? The <span className="font-semibold text-ud-primary">Export model to Excel</span> button generates the 7-sheet model with assumptions, historicals, IS / BS / CF projections, dashboard, and a styled cover.
        </div>
      </div>
    </PageWrapper>
  );
}

function PctInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Input
      label={`${label} (%)`}
      type="number"
      step="0.1"
      value={(value * 100).toFixed(2)}
      onChange={(e) => onChange(Number(e.target.value) / 100)}
    />
  );
}

function ProjectionTable({ title, rows, years }: {
  title: string;
  rows: { label: string; values: number[]; total?: boolean }[];
  years: string[];
}) {
  return (
    <div className="bg-white border border-ud-border rounded-2xl shadow-card overflow-hidden">
      <div className="px-4 py-3 bg-ud-surface-2 border-b border-ud-border">
        <h3 className="font-display font-bold text-sm">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ud-border text-xs uppercase tracking-[0.06em] text-ud-text-muted">
              <th className="text-left px-4 py-2" scope="col">Line</th>
              {years.map((y) => (
                <th key={y} className="text-right px-4 py-2" scope="col">{y}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={r.total ? "bg-ud-primary-50/40 font-semibold" : i % 2 ? "bg-ud-surface-2/50" : ""}>
                <td className="px-4 py-2 text-ud-text-secondary">{r.label}</td>
                {r.values.map((v, j) => (
                  <td key={j} className="px-4 py-2 text-right">
                    {v < 0
                      ? <span className="text-ud-danger font-mono tabular-nums">(<CurrencyDisplay amount={Math.abs(v)} showSymbol={false} />)</span>
                      : <CurrencyDisplay amount={v} showSymbol={false} className="font-mono tabular-nums" />
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
