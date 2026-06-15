"use client";
import { useState } from "react";
import { Plus, Flame, Snowflake, Thermometer } from "lucide-react";
import toast from "react-hot-toast";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { useSession } from "next-auth/react";
import { useLeads } from "@/lib/hooks/useLeads";
import { formatDate } from "@/lib/utils/dates";
import { useT } from "@/lib/hooks/useT";
import type { Lead, LeadSource, LeadTemperature } from "@/types";

const TEMP_BADGE = { Hot: "danger", Warm: "warning", Cold: "info" } as const;
const TEMP_ICON  = { Hot: Flame,   Warm: Thermometer, Cold: Snowflake } as const;

interface FormState {
  name: string;
  company: string;
  phone: string;
  email: string;
  source: LeadSource;
  temperature: LeadTemperature;
  expectedValue: number;
  followUpDate: string;
}

function emptyForm(): FormState {
  const today = new Date().toISOString().split("T")[0]!;
  return {
    name: "",
    company: "",
    phone: "+255 ",
    email: "",
    source: "Web",
    temperature: "Warm",
    expectedValue: 0,
    followUpDate: today,
  };
}

export default function LeadsPage() {
  const t = useT();
  const { leads, loading: dataLoading, addLead, updateLeadStatus } = useLeads();
  const { data: session } = useSession();
  const loading = dataLoading;
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [statusEdit, setStatusEdit] = useState<Lead | null>(null);

  async function save() {
    if (!form.name.trim() || !form.company.trim()) {
      toast.error(t("Name and company are required"));
      return;
    }
    const lead: Lead = {
      id: `lead_${Date.now()}`,
      name: form.name.trim(),
      company: form.company.trim(),
      phone: form.phone,
      email: form.email,
      source: form.source,
      status: "New",
      temperature: form.temperature,
      assignedTo: session?.user?.name ?? "",
      expectedValue: form.expectedValue,
      followUpDate: form.followUpDate,
      createdAt: new Date().toISOString(),
    };
    const r = await addLead(lead);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success(t("Added {name}", { name: lead.name }));
    setModalOpen(false);
    setForm(emptyForm());
  }

  const cols: Column<Lead>[] = [
    { key: "name", label: "Lead", render: (r) => <div><div className="font-medium">{r.name}</div><div className="text-xs text-ud-text-muted">{r.company}</div></div> },
    { key: "phone", label: "Contact", render: (r) => <div className="text-xs"><div>{r.phone}</div><div className="text-ud-text-muted">{r.email}</div></div> },
    { key: "source", label: "Source", render: (r) => <Badge variant="default" size="sm">{t(r.source)}</Badge> },
    { key: "status", label: "Status", render: (r) => <Badge variant={r.status === "Qualified" ? "success" : r.status === "Lost" ? "danger" : "info"}>{t(r.status)}</Badge> },
    { key: "temperature", label: "Temp", render: (r) => {
      const Icon = TEMP_ICON[r.temperature];
      return <Badge variant={TEMP_BADGE[r.temperature]}><Icon className="w-2.5 h-2.5" />{t(r.temperature)}</Badge>;
    } },
    { key: "expectedValue", label: "Est. value", sortable: true, align: "right", render: (r) => <CurrencyDisplay amount={r.expectedValue} compact /> },
    { key: "followUpDate", label: "Follow up", render: (r) => formatDate(r.followUpDate) },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Leads"
        subtitle={t("{active} active leads · {hot} hot", { active: leads.length, hot: leads.filter((l) => l.temperature === "Hot").length })}
        breadcrumbs={[{ label: "CRM", href: "/crm" }, { label: "Leads" }]}
        actions={<Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>{t("Add lead")}</Button>}
      />
      {loading ? <TableSkeleton rows={10} columns={7} /> :
        <DataTable
          data={leads}
          columns={cols}
          pageSize={15}
          initialSortKey="expectedValue"
          initialSortDir="desc"
          rowKey={(r) => r.id}
          onRowClick={(r) => setStatusEdit(r)}
        />
      }

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Add lead"
        description="Capture a new prospect and assign a follow-up."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>{t("Cancel")}</Button>
            <Button variant="primary" onClick={() => void save()}>{t("Add lead")}</Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Lead name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Company"   value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            <Input label="Phone"     value={form.phone}   onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Email"     value={form.email}   onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Select label="Source"      value={form.source}      onValueChange={(v) => setForm({ ...form, source: v as LeadSource })}      options={[
              { value: "Web", label: "Web" }, { value: "Referral", label: "Referral" }, { value: "Cold Call", label: "Cold Call" }, { value: "Social", label: "Social" }, { value: "Walk-in", label: "Walk-in" },
            ]} />
            <Select label="Temperature" value={form.temperature} onValueChange={(v) => setForm({ ...form, temperature: v as LeadTemperature })} options={[
              { value: "Hot", label: "Hot" }, { value: "Warm", label: "Warm" }, { value: "Cold", label: "Cold" },
            ]} />
            <Input label="Expected value (TZS)" type="number" value={String(form.expectedValue)} onChange={(e) => setForm({ ...form, expectedValue: Number(e.target.value) || 0 })} />
            <Input label="Follow-up date" type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
          </div>
        </div>
      </Modal>

      <Modal
        open={statusEdit !== null}
        onOpenChange={(o) => !o && setStatusEdit(null)}
        title={statusEdit ? t("Update {name}", { name: statusEdit.name }) : ""}
        description="Move the lead through the qualification funnel."
        size="sm"
      >
        {statusEdit && (
          <div className="grid grid-cols-2 gap-2">
            {(["New", "Contacted", "Qualified", "Lost"] as const).map((s) => (
              <button
                key={s}
                onClick={() => { void updateLeadStatus(statusEdit.id, s); toast.success(t("Lead set to {status}", { status: t(s) })); setStatusEdit(null); }}
                className={`p-3 rounded-xl border text-sm font-medium transition-all min-h-[56px] ${
                  statusEdit.status === s ? "border-ud-primary bg-ud-primary-50 text-ud-primary" : "border-ud-border hover:border-ud-primary/40"
                }`}
              >
                {t(s)}
              </button>
            ))}
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
