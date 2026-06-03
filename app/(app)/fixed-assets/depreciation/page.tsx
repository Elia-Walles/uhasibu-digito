"use client";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { DepreciationChart } from "@/components/charts/DepreciationChart";
import { useDataStore } from "@/lib/store/dataStore";

export default function DepreciationPage() {
  const assets = useDataStore((s) => s.assets);
  const active = assets.filter((a) => a.status === "Active");

  return (
    <PageWrapper>
      <PageHeader
        title="Depreciation Schedule"
        subtitle="Straight-line depreciation over useful life"
        breadcrumbs={[{ label: "Fixed Assets", href: "/fixed-assets" }, { label: "Depreciation" }]}
      />

      <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card mb-6">
        <h3 className="font-display font-bold text-base mb-3">Total NBV — historical & forecast</h3>
        <DepreciationChart />
      </div>

      <div className="bg-white border border-ud-border rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ud-surface-2 text-xs uppercase tracking-[0.06em] text-ud-text-secondary">
              <tr>
                <th className="text-left px-4 py-3" scope="col">Asset</th>
                <th className="text-right px-4 py-3" scope="col">Cost</th>
                <th className="text-right px-4 py-3" scope="col">Useful life</th>
                <th className="text-right px-4 py-3" scope="col">Annual dep.</th>
                <th className="text-right px-4 py-3" scope="col">Accum.</th>
                <th className="text-right px-4 py-3" scope="col">NBV</th>
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
