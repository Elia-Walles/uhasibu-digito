"use client";
import Link from "next/link";
import { ClipboardCheck, ShoppingCart, Truck, Receipt, Download, AlertTriangle } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { useDataStore } from "@/lib/store/dataStore";
import { AUDIT_STEPS } from "@/lib/mock-data/audit-steps";
import { exportAuditReport } from "@/lib/utils/audit-export";
import type { AuditProcedure } from "@/types";
import toast from "react-hot-toast";

const PROCEDURE_META: Record<AuditProcedure, { title: string; description: string; href: string; icon: React.ElementType }> = {
  Expenses:  { title: "Expenses",  description: "Capture · authorisation · documentation · GL · VAT · tax compliance",   href: "/audit/expenses",  icon: Receipt },
  Purchases: { title: "Purchases", description: "PR → proforma → supplier invoice → DN → GRN → PV → EFD",               href: "/audit/purchases", icon: Truck },
  Sales:     { title: "Sales",     description: "Quotation → PO → SO → DN → sales invoice → receipt / proof of payment", href: "/audit/sales",     icon: ShoppingCart },
};

export default function AuditLandingPage() {
  const auditState = useDataStore((s) => s.auditState);
  const engagement = useDataStore((s) => s.auditEngagement);
  const updateAuditEngagement = useDataStore((s) => s.updateAuditEngagement);

  async function handleExport() {
    try {
      await exportAuditReport(engagement, auditState);
      toast.success("Audit report exported");
    } catch (err) {
      console.error(err);
      toast.error("Audit export failed");
    }
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Audit"
        subtitle="Procedures, evidence, working papers — exportable audit report"
        actions={
          <Button variant="primary" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
            Export audit report
          </Button>
        }
      />

      <div className="mb-4 flex items-start gap-3 p-4 rounded-2xl border border-ud-warning/30 bg-ud-warning-bg">
        <AlertTriangle className="w-5 h-5 text-ud-warning flex-shrink-0 mt-0.5" />
        <div className="text-sm text-ud-text-secondary leading-relaxed">
          <Badge variant="warning" size="sm" className="mb-1">Demo audit shell</Badge>
          <p>
            Audit procedures here demonstrate the workflow against the platform&apos;s mock data. A real
            engagement requires sampling, materiality, working papers, and partner sign-off — out of scope for
            the demo. Use this to walk an expert through the Tanzania purchase / sales / expense cycles end to
            end and produce an Excel report.
          </p>
        </div>
      </div>

      <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card mb-6">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardCheck className="w-4 h-4 text-ud-primary" />
          <h2 className="font-display font-bold text-base">Engagement</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input label="Engagement name" value={engagement.name} onChange={(e) => updateAuditEngagement({ name: e.target.value })} />
          <Input label="Period"          value={engagement.period} onChange={(e) => updateAuditEngagement({ period: e.target.value })} />
          <Input label="Auditor"         value={engagement.auditorName} onChange={(e) => updateAuditEngagement({ auditorName: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(["Expenses", "Purchases", "Sales"] as AuditProcedure[]).map((proc) => {
          const meta = PROCEDURE_META[proc];
          const steps = AUDIT_STEPS[proc];
          const results = auditState[proc].results;
          const passed = steps.filter((s) => results[s.key]?.status === "Passed").length;
          const exceptions = steps.filter((s) => results[s.key]?.status === "Exception").length;
          const Icon = meta.icon;
          return (
            <Link
              key={proc}
              href={meta.href}
              className="group bg-white border border-ud-border rounded-2xl p-5 shadow-card hover:border-ud-primary hover:shadow-card-hover transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-ud-primary-50 text-ud-primary flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base">{meta.title}</h3>
                  <p className="text-xs text-ud-text-muted mt-0.5 line-clamp-2">{meta.description}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 flex-wrap text-xs">
                <Badge variant="success" size="sm">{passed} passed</Badge>
                {exceptions > 0 && <Badge variant="danger" size="sm" pulse>{exceptions} exception{exceptions === 1 ? "" : "s"}</Badge>}
                <span className="text-ud-text-muted">of {steps.length} steps</span>
              </div>
              <div className="mt-3 h-1.5 bg-ud-surface-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-ud-primary to-ud-primary-light transition-all"
                  style={{ width: `${((passed + exceptions) / steps.length) * 100}%` }}
                />
              </div>
              <div className="mt-3 text-xs text-ud-primary font-medium group-hover:underline">
                Open procedure →
              </div>
            </Link>
          );
        })}
      </div>
    </PageWrapper>
  );
}
