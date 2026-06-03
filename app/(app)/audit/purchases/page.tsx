"use client";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { AuditChecklist } from "@/components/audit/AuditChecklist";
import { AUDIT_STEPS } from "@/lib/mock-data/audit-steps";

export default function AuditPurchasesPage() {
  return (
    <PageWrapper>
      <PageHeader
        title="Audit — Purchases"
        subtitle="Full procurement cycle: PR → proforma → supplier invoice → DN → GRN → PV → EFD"
        breadcrumbs={[{ label: "Audit", href: "/audit" }, { label: "Purchases" }]}
      />
      <AuditChecklist
        procedure="Purchases"
        title="Procedures of purchases"
        description="Verifies the seven-step Tanzania procurement cycle is followed end-to-end with the required evidence at each stage."
        steps={AUDIT_STEPS.Purchases}
      />
    </PageWrapper>
  );
}
