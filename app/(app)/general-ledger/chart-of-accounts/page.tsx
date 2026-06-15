"use client";
import { useEffect, useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { Badge } from "@/components/ui/Badge";
import { useCOA } from "@/lib/hooks/useCOA";
import { useT } from "@/lib/hooks/useT";
import type { COAAccount } from "@/types";
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
  const t = useT();
  const { accounts, loading } = useCOA();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpanded(new Set(accounts.filter((c) => c.parentCode === null).map((c) => c.code)));
  }, [accounts]);

  function toggle(code: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function isVisible(account: COAAccount): boolean {
    if (!account.parentCode) return true;
    let current = account.parentCode;
    while (current) {
      if (!expanded.has(current)) return false;
      const parent = accounts.find((a) => a.code === current);
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
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[1fr_120px_140px_140px_140px] px-4 py-3 bg-ud-surface-2 border-b border-ud-border text-xs uppercase tracking-[0.06em] font-semibold text-ud-text-secondary">
              <div>{t("Account")}</div>
              <div>{t("Type")}</div>
              <div className="text-right">{t("Opening")}</div>
              <div className="text-right">{t("Movement")}</div>
              <div className="text-right">{t("Closing")}</div>
            </div>
            <div>
              {loading && accounts.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-ud-text-muted">{t("Loading…")}</div>
              )}
              {accounts.filter(isVisible).map((account) => {
                const hasChildren = accounts.some((a) => a.parentCode === account.code);
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
                    <div><Badge variant={TYPE_COLOR[account.type]} size="sm">{t(account.type)}</Badge></div>
                    <CurrencyDisplay amount={account.openingBalance} showSymbol={false} className="text-right text-ud-text-muted" />
                    <CurrencyDisplay amount={account.movement}       showSymbol={false} className="text-right" />
                    <CurrencyDisplay amount={account.closingBalance} showSymbol={false} className="text-right font-medium" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
