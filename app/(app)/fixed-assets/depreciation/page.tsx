"use client";
import { useState } from "react";
import { AlertTriangle, CalendarClock } from "lucide-react";
import toast from "react-hot-toast";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { DepreciationChart } from "@/components/charts/DepreciationChart";
import { useFixedAssets } from "@/lib/hooks/useFixedAssets";
import { useExports } from "@/lib/hooks/useExports";
import { useT } from "@/lib/hooks/useT";
import { STANDARD_RATES } from "@/lib/utils/depreciation-rates";
import type { AssetCategory } from "@/types";

const CLASSES: AssetCategory[] = ["Building", "Vehicle", "Equipment", "Computer", "Furniture"];

export default function DepreciationPage() {
  const t = useT();
  const { assets, runDepreciation } = useFixedAssets();
  const { exportDepreciation } = useExports();
  const active = assets.filter((a) => a.status === "Active");
  const [running, setRunning] = useState(false);
  const period = new Date().toISOString().slice(0, 7); // YYYY-MM

  async function handleRun() {
    setRunning(true);
    try {
      const res = await runDepreciation(period);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("Posted depreciation for {n} asset(s) · TSh {amt}", { n: res.data.assets, amt: Math.round(res.data.amount).toLocaleString() }));
    } finally {
      setRunning(false);
    }
  }

  async function handleExport() {
    try {
      await exportDepreciation(assets);
      toast.success(t("Depreciation schedule exported"));
    } catch (err) {
      console.error(err);
      toast.error(t("Excel export failed"));
    }
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Depreciation Schedule"
        subtitle="Straight-line and reducing-balance methods per Tanzania classes"
        breadcrumbs={[{ label: "Fixed Assets", href: "/fixed-assets" }, { label: "Depreciation" }]}
        actions={
          <>
            <Button variant="primary" icon={<CalendarClock className="w-4 h-4" />} loading={running} onClick={() => void handleRun()}>
              {t("Run depreciation · {period}", { period })}
            </Button>
            <ExportMenu fileLabel="Depreciation schedule" onExportExcel={handleExport} />
          </>
        }
      />

      <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-base">{t("Standard rates by asset class")}</h3>
          <Badge variant="info" size="sm">{t("TRA / NBAA-aligned defaults")}</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-ud-surface-2 text-xs uppercase tracking-[0.06em] text-ud-text-secondary">
              <tr>
                <th className="text-left px-4 py-2.5" scope="col">{t("Class")}</th>
                <th className="text-right px-4 py-2.5" scope="col">{t("Straight-line")}</th>
                <th className="text-right px-4 py-2.5" scope="col">{t("Reducing balance")}</th>
                <th className="text-right px-4 py-2.5" scope="col">{t("Useful life")}</th>
                <th className="text-left px-4 py-2.5" scope="col">{t("Basis")}</th>
              </tr>
            </thead>
            <tbody>
              {CLASSES.map((cls) => {
                const r = STANDARD_RATES[cls];
                return (
                  <tr key={cls} className="border-t border-ud-border">
                    <td className="px-4 py-2.5 font-medium">{cls}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{(r.slPct * 100).toFixed(1)}%</td>
                    <td className="px-4 py-2.5 text-right font-mono">{(r.rbPct * 100).toFixed(1)}%</td>
                    <td className="px-4 py-2.5 text-right font-mono">{r.usefulLife} yr</td>
                    <td className="px-4 py-2.5 text-xs text-ud-text-muted">{r.basis}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-start gap-2 text-xs text-ud-text-muted">
          <AlertTriangle className="w-3.5 h-3.5 text-ud-warning flex-shrink-0 mt-0.5" />
          {t("Rates are TRA / NBAA defaults shown for reference. Verify with your tax advisor for each engagement; specific classes (e.g. heavy machinery vs office equipment) may have different rates.")}
        </div>
      </div>

      <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card mb-6">
        <h3 className="font-display font-bold text-base mb-3">{t("Total NBV historical & forecast")}</h3>
        <DepreciationChart />
      </div>

      <div className="bg-white border border-ud-border rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-ud-surface-2 text-xs uppercase tracking-[0.06em] text-ud-text-secondary">
              <tr>
                <th className="text-left px-4 py-3" scope="col">{t("Asset")}</th>
                <th className="text-right px-4 py-3" scope="col">{t("Cost")}</th>
                <th className="text-right px-4 py-3" scope="col">{t("Useful life")}</th>
                <th className="text-right px-4 py-3" scope="col">{t("Annual dep.")}</th>
                <th className="text-right px-4 py-3" scope="col">{t("Accum.")}</th>
                <th className="text-right px-4 py-3" scope="col">{t("NBV")}</th>
              </tr>
            </thead>
            <tbody>
              {active.map((a, i) => {
                const annual = (a.cost - a.residualValue) / a.usefulLifeYears;
                return (
                  <tr key={a.id} className={i % 2 === 1 ? "bg-ud-surface-2/50" : ""}>
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs text-ud-text-muted">{a.code}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right"><CurrencyDisplay amount={a.cost} showSymbol={false} /></td>
                    <td className="px-4 py-2.5 text-right font-mono">{a.usefulLifeYears} yr</td>
                    <td className="px-4 py-2.5 text-right"><CurrencyDisplay amount={annual} showSymbol={false} /></td>
                    <td className="px-4 py-2.5 text-right text-ud-danger"><CurrencyDisplay amount={a.accumulatedDepreciation} showSymbol={false} /></td>
                    <td className="px-4 py-2.5 text-right font-bold"><CurrencyDisplay amount={a.netBookValue} showSymbol={false} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrapper>
  );
}
