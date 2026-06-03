"use client";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { AuditChecklist } from "@/components/audit/AuditChecklist";
import { AUDIT_STEPS } from "@/lib/mock-data/audit-steps";

export default function AuditExpensesPage() {
  return (
    <PageWrapper>
      <PageHeader
        title="Audit — Expenses"
        subtitle="Audit procedures applied to expense recognition and recording"
        breadcrumbs={[{ label: "Audit", href: "/audit" }, { label: "Expenses" }]}
      />
      <AuditChecklist
        procedure="Expenses"
        title="Procedures of expenses"
        description="Walks the auditor through capture, authorisation, documentation, GL posting, VAT, and tax compliance for each sampled expense."
        steps={AUDIT_STEPS.Expenses}
      />
    </PageWrapper>
  );
}
