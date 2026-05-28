"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, FolderTree, Scale } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { FilterBar } from "@/components/ui/FilterBar";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { useLoadingSimulation } from "@/lib/hooks/useLoadingSimulation";
import { useDataStore } from "@/lib/store/dataStore";
import { formatDate } from "@/lib/utils/dates";
import type { GLEntry } from "@/types";

const COLS: Column<GLEntry>[] = [
  { key: "date", label: "Date", sortable: true, render: (r) => formatDate(r.date), width: "100px" },
  { key: "reference", label: "Reference", className: "font-mono text-xs", width: "140px" },
  { key: "account", label: "Account", sortable: true,
    render: (r) => <div><div className="text-sm font-medium">{r.account}</div><div className="text-xs text-ud-text-muted">{r.accountCode}</div></div> },
  { key: "narration", label: "Narration", render: (r) => <span className="text-ud-text-secondary">{r.narration}</span> },
  { key: "costCentre", label: "Cost Centre", render: (r) => <Badge variant="default" size="sm">{r.costCentre}</Badge> },
  { key: "debit",  label: "Debit",  sortable: true, align: "right",  render: (r) => r.debit  > 0 ? <CurrencyDisplay amount={r.debit}  showSymbol={false} /> : <span className="text-ud-text-faint">—</span> },
  { key: "credit", label: "Credit", sortable: true, align: "right",  render: (r) => r.credit > 0 ? <CurrencyDisplay amount={r.credit} showSymbol={false} /> : <span className="text-ud-text-faint">—</span> },
];

export default function GLPage() {
  const loading = useLoadingSimulation(800);
  const [search, setSearch] = useState("");
  const { glEntries } = useDataStore();

  const filtered = useMemo(() => {
    if (!search) return glEntries;
    const q = search.toLowerCase();
    return glEntries.filter((e) =>
      e.account.toLowerCase().includes(q) ||
      e.accountCode.includes(q) ||
      e.reference.toLowerCase().includes(q) ||
      e.narration.toLowerCase().includes(q)
    );
  }, [search, glEntries]);

  return (
    <PageWrapper>
      <PageHeader
        title="General Ledger"
        subtitle={`${glEntries.length} posted journal entries · October 2024`}
        actions={
          <>
            <Link href="/general-ledger/chart-of-accounts"><Button variant="outline" icon={<FolderTree className="w-4 h-4" />}>Chart of Accounts</Button></Link>
            <Link href="/general-ledger/trial-balance"><Button variant="outline" icon={<Scale className="w-4 h-4" />}>Trial Balance</Button></Link>
            <Link href="/general-ledger/journal-entry"><Button variant="primary" icon={<Plus className="w-4 h-4" />}>New Entry</Button></Link>
          </>
        }
      />
      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search account, reference, narration…" />
      {loading ? <TableSkeleton rows={10} columns={7} /> :
        <DataTable data={filtered} columns={COLS} pageSize={15} initialSortKey="date" initialSortDir="desc" rowKey={(r) => r.id} />
      }
    </PageWrapper>
  );
}
