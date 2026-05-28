"use client";
import { useState } from "react";
import { Plus, Mail, Phone } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { Modal } from "@/components/ui/Modal";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { useLoadingSimulation } from "@/lib/hooks/useLoadingSimulation";
import { EMPLOYEES } from "@/lib/mock-data/employees";
import type { Employee } from "@/types";

export default function EmployeesPage() {
  const loading = useLoadingSimulation(800);
  const [selected, setSelected] = useState<Employee | null>(null);

  return (
    <PageWrapper>
      <PageHeader
        title="Employees"
        subtitle={`${EMPLOYEES.length} active employees across all departments`}
        breadcrumbs={[{ label: "Payroll", href: "/payroll" }, { label: "Employees" }]}
        actions={<Button variant="primary" icon={<Plus className="w-4 h-4" />}>Add employee</Button>}
      />

      {loading ? <CardGridSkeleton count={12} cols={3} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {EMPLOYEES.map((e) => (
            <button
              key={e.id}
              onClick={() => setSelected(e)}
              className="text-left bg-white border border-ud-border rounded-2xl p-4 hover:border-ud-primary hover:shadow-card-hover transition-all"
            >
              <div className="flex items-start gap-3">
                <Avatar initials={e.firstName[0]! + e.lastName[0]!} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-ud-text-primary truncate">{e.fullName}</div>
                  <div className="text-xs text-ud-text-muted">{e.position}</div>
                  <Badge variant="teal" size="sm" className="mt-1.5">{e.department}</Badge>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-ud-text-muted">Gross monthly</div>
                  <div className="font-mono font-bold tabular-nums"><CurrencyDisplay amount={e.grossSalary} compact /></div>
                </div>
                <div>
                  <div className="text-ud-text-muted">Leave balance</div>
                  <div className="font-mono tabular-nums">{e.leaveBalance} days</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected?.fullName ?? ""}
        description={selected?.position}
        size="md"
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Employee #">{selected.employeeNumber}</Field>
              <Field label="Department">{selected.department}</Field>
              <Field label="Start date">{selected.startDate}</Field>
              <Field label="Type">{selected.employmentType}</Field>
              <Field label="NSSF #">{selected.nssf}</Field>
              <Field label="TIN">{selected.tin}</Field>
            </div>
            <div className="divider-hairline" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Basic salary"><CurrencyDisplay amount={selected.basicSalary} /></Field>
              <Field label="Housing"><CurrencyDisplay amount={selected.housingAllowance} /></Field>
              <Field label="Transport"><CurrencyDisplay amount={selected.transportAllowance} /></Field>
              <Field label="Gross"><CurrencyDisplay amount={selected.grossSalary} className="font-bold" /></Field>
            </div>
            <div className="divider-hairline" />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-ud-text-secondary"><Mail className="w-3.5 h-3.5" />{selected.email}</div>
              <div className="flex items-center gap-2 text-ud-text-secondary"><Phone className="w-3.5 h-3.5" />{selected.phone}</div>
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-ud-text-muted">{label}</div>
      <div className="font-medium text-ud-text-primary mt-0.5">{children}</div>
    </div>
  );
}
