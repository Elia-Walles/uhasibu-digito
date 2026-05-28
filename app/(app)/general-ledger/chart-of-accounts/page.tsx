"use client";
import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { Badge } from "@/components/ui/Badge";
import { COA } from "@/lib/mock-data/gl-entries";
import { cn } from "@/lib/utils/cn";

const TYPE_COLOR = {
  Asset:       "teal",
  Liability:   "warning",
  Equity:      "info",
  Income:      "success",
  Expense:     "danger",
  CostOfSales: "default",
} as const;

export default function COAPage() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(COA.filter((c) => c.parentCode === null).map((c) => c.code)));

  function toggle(code: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function isVisible(account: typeof COA[number]): boolean {
    if (!account.parentCode) return true;
    let current = account.parentCode;
    while (current) {
      if (!expanded.has(current)) return false;
      const parent = COA.find((a) => a.code === current);
      current = parent?.parentCode ?? "";
    }
    return true;
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Chart of Accounts"
        subtitle="Tanzania-compliant chart with running balances"
        breadcrumbs={[{ label: "General Ledger", href: "/general-ledger" }, { label: "Chart of Accounts" }]}
        actions={<ExportMenu fileLabel="Chart of Accounts" />}
      />

      <div className="bg-white border border-ud-border rounded-2xl overflow-hidden shadow-card">
        <div className="grid grid-cols-[1fr_120px_140px_140px_140px] px-4 py-3 bg-ud-surface-2 border-b border-ud-border text-xs uppercase tracking-[0.06em] font-semibold text-ud-text-secondary">
          <div>Account</div>
          <div>Type</div>
          <div className="text-right">Opening</div>
          <div className="text-right">Movement</div>
          <div className="text-right">Closing</div>
        </div>
        <div>
          {COA.filter(isVisible).map((account) => {
            const hasChildren = COA.some((a) => a.parentCode === account.code);
            const isExpanded = expanded.has(account.code);
            return (
              <button
                key={account.code}
                onClick={() => hasChildren && toggle(account.code)}
                className={cn(
                  "w-full grid grid-cols-[1fr_120px_140px_140px_140px] px-4 py-2.5 items-center text-left border-b border-ud-border last:border-b-0 hover:bg-ud-surface-2 transition-colors",
                  account.level === 0 && "bg-ud-primary-50/40 font-semibold"
                )}
                style={{ paddingLeft: 16 + account.level * 24 }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {hasChildren ? (isExpanded ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />) : <span className="w-3.5" />}
                  <span className="font-mono text-xs text-ud-text-muted w-12">{account.code}</span>
                  <span className="truncate">{account.name}</span>
                </div>
                <div><Badge variant={TYPE_COLOR[account.type]} size="sm">{account.type}</Badge></div>
                <CurrencyDisplay amount={account.openingBalance} showSymbol={false} className="text-right text-ud-text-muted" />
                <CurrencyDisplay amount={account.movement}       showSymbol={false} className="text-right" />
                <CurrencyDisplay amount={account.closingBalance} showSymbol={false} className="text-right font-medium" />
              </button>
            );
          })}
        </div>
      </div>
    </PageWrapper>
  );
}
