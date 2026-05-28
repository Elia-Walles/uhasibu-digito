"use client";
import { Plus, Flame, Snowflake, Thermometer } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { useLoadingSimulation } from "@/lib/hooks/useLoadingSimulation";
import { LEADS } from "@/lib/mock-data/pipeline";
import { formatDate } from "@/lib/utils/dates";
import type { Lead } from "@/types";

const TEMP_BADGE = { Hot: "danger", Warm: "warning", Cold: "info" } as const;
const TEMP_ICON = { Hot: Flame, Warm: Thermometer, Cold: Snowflake } as const;

const COLS: Column<Lead>[] = [
  { key: "name", label: "Lead", render: (r) => <div><div className="font-medium">{r.name}</div><div className="text-xs text-ud-text-muted">{r.company}</div></div> },
  { key: "phone", label: "Contact", render: (r) => <div className="text-xs"><div>{r.phone}</div><div className="text-ud-text-muted">{r.email}</div></div> },
  { key: "source", label: "Source", render: (r) => <Badge variant="default" size="sm">{r.source}</Badge> },
  { key: "status", label: "Status", render: (r) => <Badge variant={r.status === "Qualified" ? "success" : r.status === "Lost" ? "danger" : "info"}>{r.status}</Badge> },
  { key: "temperature", label: "Temp", render: (r) => {
    const Icon = TEMP_ICON[r.temperature];
    return <Badge variant={TEMP_BADGE[r.temperature]}><Icon className="w-2.5 h-2.5" />{r.temperature}</Badge>;
  } },
  { key: "expectedValue", label: "Est. value", sortable: true, align: "right", render: (r) => <CurrencyDisplay amount={r.expectedValue} compact /> },
  { key: "followUpDate", label: "Follow up", render: (r) => formatDate(r.followUpDate) },
];

export default function LeadsPage() {
  const loading = useLoadingSimulation(800);
  return (
    <PageWrapper>
      <PageHeader
        title="Leads"
        subtitle={`${LEADS.length} active leads · ${LEADS.filter((l) => l.temperature === "Hot").length} hot`}
        breadcrumbs={[{ label: "CRM", href: "/crm" }, { label: "Leads" }]}
        actions={<Button variant="primary" icon={<Plus className="w-4 h-4" />}>Add lead</Button>}
      />
      {loading ? <TableSkeleton rows={10} columns={7} /> :
        <DataTable data={LEADS} columns={COLS} pageSize={15} initialSortKey="expectedValue" initialSortDir="desc" rowKey={(r) => r.id} />
      }
    </PageWrapper>
  );
}
