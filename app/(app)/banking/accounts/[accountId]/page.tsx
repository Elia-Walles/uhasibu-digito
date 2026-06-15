"use client";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Wallet, Search } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { useBanking } from "@/lib/hooks/useBanking";
import { formatDate } from "@/lib/utils/dates";
import { formatTZS } from "@/lib/utils/currency";
import { useT } from "@/lib/hooks/useT";
import type { BankTransaction } from "@/types";

type Direction = "all" | "in" | "out";

export default function BankAccountDetailPage() {
  const t = useT();
  const params = useParams<{ accountId: string }>();
  const { bankAccounts, loading: bankLoading } = useBanking();
  const loading = bankLoading;
  const account = bankAccounts.find((a) => a.id === params.accountId);

  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState<Direction>("all");

  const filtered = useMemo(() => {
    if (!account) return [] as BankTransaction[];
    const q = search.trim().toLowerCase();
    return account.transactions.filter((tx) => {
      if (direction === "in"  && tx.credit === 0) return false;
      if (direction === "out" && tx.debit  === 0) return false;
      if (!q) return true;
      return (
        tx.description.toLowerCase().includes(q) ||
        tx.reference.toLowerCase().includes(q)
      );
    });
  }, [account, search, direction]);

  if (!account) {
    return (
      <PageWrapper>
        <PageHeader
          title="Account not found"
          breadcrumbs={[{ label: "Banking", href: "/banking" }, { label: "Unknown" }]}
        />
        <EmptyState icon={Wallet} title="Account not found" description="Check the link and try again." />
      </PageWrapper>
    );
  }

  const isUSD = account.currency === "USD";
  const inflows  = filtered.reduce((s, t) => s + t.credit, 0);
  const outflows = filtered.reduce((s, t) => s + t.debit,  0);
  const matched  = filtered.filter((t) => t.matched).length;

  const cols: Column<BankTransaction>[] = [
    { key: "date", label: "Date", sortable: true, width: "110px", render: (row) => <span className="font-mono text-xs">{formatDate(row.date)}</span> },
    { key: "reference", label: "Reference", className: "font-mono text-xs", width: "120px" },
    { key: "description", label: "Description" },
    { key: "debit", label: "Debit", align: "right", sortable: true, render: (row) =>
      row.debit > 0
        ? <span className="font-mono tabular-nums text-ud-danger">({(row.debit).toLocaleString()})</span>
        : <span className="text-ud-text-faint"></span>
    },
    { key: "credit", label: "Credit", align: "right", sortable: true, render: (row) =>
      row.credit > 0
        ? <span className="font-mono tabular-nums text-ud-success">{row.credit.toLocaleString()}</span>
        : <span className="text-ud-text-faint"></span>
    },
    { key: "balance", label: "Balance", align: "right", render: (row) =>
      <span className="font-mono tabular-nums font-medium">{row.balance.toLocaleString()}</span>
    },
    { key: "matched", label: "Reconciled", align: "center", render: (row) =>
      <Badge variant={row.matched ? "success" : "default"} size="sm">{row.matched ? t("Matched") : t("Open")}</Badge>
    },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title={`${account.bankName} ${account.accountName}`}
        subtitle={`Account ${account.accountNumber} · ${account.currency}`}
        breadcrumbs={[{ label: "Banking", href: "/banking" }, { label: account.bankName }]}
        actions={<ExportMenu fileLabel={`${account.bankName} statement`} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card">
          <div className="text-xs uppercase tracking-[0.08em] font-semibold text-ud-text-muted">{t("Current balance")}</div>
          <div className="font-display font-extrabold text-2xl tabular-nums mt-2">
            {isUSD ? `$${account.balance.toLocaleString()}` : <CurrencyDisplay amount={account.balance} />}
          </div>
        </div>
        <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card">
          <div className="text-xs uppercase tracking-[0.08em] font-semibold text-ud-text-muted">{t("Inflows (filtered)")}</div>
          <div className="font-display font-extrabold text-2xl tabular-nums mt-2 text-ud-success">
            {isUSD ? `$${inflows.toLocaleString()}` : formatTZS(inflows, true)}
          </div>
        </div>
        <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card">
          <div className="text-xs uppercase tracking-[0.08em] font-semibold text-ud-text-muted">{t("Outflows (filtered)")}</div>
          <div className="font-display font-extrabold text-2xl tabular-nums mt-2 text-ud-danger">
            {isUSD ? `$${outflows.toLocaleString()}` : formatTZS(outflows, true)}
          </div>
        </div>
      </div>

      <div className="bg-white border border-ud-border rounded-2xl p-4 shadow-card mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Search by description or reference…")}
            prefixIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="inline-flex items-center p-1 rounded-xl bg-ud-surface-2 border border-ud-border">
          {(["all", "in", "out"] as Direction[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDirection(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px] ${
                direction === d ? "bg-ud-primary text-white" : "text-ud-text-secondary hover:text-ud-text-primary"
              }`}
            >
              {d === "all" ? t("All") : d === "in" ? t("Inflows") : t("Outflows")}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 text-xs text-ud-text-muted">
        {t("Showing")} <span className="font-medium text-ud-text-primary">{filtered.length}</span> {t("of")}{" "}
        <span className="font-medium text-ud-text-primary">{account.transactions.length}</span> {t("transactions ·")}{" "}
        <span className="font-medium text-ud-text-primary">{matched}</span> {t("reconciled")}
      </div>

      {loading ? <TableSkeleton rows={10} columns={7} /> : (
        <DataTable
          data={filtered}
          columns={cols}
          pageSize={15}
          initialSortKey="date"
          rowKey={(t) => t.id}
          emptyTitle="No transactions"
          emptyDescription="No transactions match the current filters."
        />
      )}
    </PageWrapper>
  );
}
