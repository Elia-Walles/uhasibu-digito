"use client";
import { Mail, MessageCircle, Send } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDataStore } from "@/lib/store/dataStore";
import { formatDateTime } from "@/lib/utils/dates";
import type { SendLogEntry } from "@/types";

const CHANNEL_ICON: Record<SendLogEntry["channel"], React.ElementType> = {
  Email: Mail,
  WhatsApp: MessageCircle,
  Both: Send,
};

export default function SentLogPage() {
  const sendLog = useDataStore((s) => s.sendLog);

  const cols: Column<SendLogEntry>[] = [
    { key: "sentAt", label: "Sent at", width: "180px", render: (e) => <span className="font-mono text-xs">{formatDateTime(e.sentAt)}</span> },
    { key: "invoiceNumber", label: "Invoice", className: "font-mono text-xs", width: "150px" },
    { key: "customerName", label: "Customer" },
    { key: "channel", label: "Channel", render: (e) => {
      const Icon = CHANNEL_ICON[e.channel];
      return <Badge variant={e.channel === "Email" ? "info" : e.channel === "WhatsApp" ? "success" : "teal"} size="sm">
        <Icon className="w-3 h-3 mr-1 inline-block" />{e.channel}
      </Badge>;
    } },
    { key: "recipient", label: "Recipient", className: "font-mono text-xs" },
    { key: "status", label: "Status", render: (e) => (
      <Badge variant={e.status === "Delivered" ? "success" : e.status === "Failed" ? "danger" : "warning"}>{e.status}</Badge>
    ) },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Sent log"
        subtitle="Demo simulation of invoice delivery via email and WhatsApp"
        breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Sent log" }]}
      />

      <div className="mb-4 px-4 py-3 rounded-xl bg-ud-info-bg/60 border border-ud-info/15 text-xs text-ud-text-secondary leading-relaxed">
        Send is simulated. No real email or WhatsApp message is dispatched — this log records what would have
        been sent so the workflow is demonstrable. For production, wire to a transactional email provider and a
        WhatsApp Business Cloud API account.
      </div>

      {sendLog.length === 0 ? (
        <EmptyState
          icon={Send}
          title="No sends yet"
          description="Send an invoice from the New Invoice screen to populate this log."
        />
      ) : (
        <DataTable
          data={sendLog}
          columns={cols}
          pageSize={15}
          initialSortKey="sentAt"
          rowKey={(e) => e.id}
        />
      )}
    </PageWrapper>
  );
}
