"use client";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { AuditChecklist } from "@/components/audit/AuditChecklist";
import { AUDIT_STEPS } from "@/lib/mock-data/audit-steps";

export default function AuditSalesPage() {
  return (
    <PageWrapper>
      <PageHeader
        title="Audit — Sales"
        subtitle="Quotation → customer PO → SO → delivery → fiscalised invoice → receipt"
        breadcrumbs={[{ label: "Audit", href: "/audit" }, { label: "Sales" }]}
      />
      <AuditChecklist
        procedure="Sales"
        title="Procedures of sales"
        description="Walks the auditor through the full sales cycle and confirms each document exists, is signed, and matches the next."
        steps={AUDIT_STEPS.Sales}
      />
    </PageWrapper>
  );
}
