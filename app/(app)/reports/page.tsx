"use client";
import { useState } from "react";
import { FileText, Download, ShieldCheck } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { fromNow } from "@/lib/utils/dates";
import type { Report, ReportCategory } from "@/types";
import toast from "react-hot-toast";

const CATEGORY_ORDER: ReportCategory[] = ["Financial", "Management", "Tax", "Operational", "Payroll"];

// Report catalogue the set of statements/registers the platform can produce.
const REPORTS: Report[] = [
  { id: "r_is", name: "Income Statement", category: "Financial", description: "Revenue, costs, and profit for a period.", lastGenerated: null, isAvailable: true },
  { id: "r_bs", name: "Balance Sheet", category: "Financial", description: "Assets, liabilities, and equity at a date.", lastGenerated: null, isAvailable: true },
  { id: "r_cf", name: "Cash Flow Statement", category: "Financial", description: "Movement in cash and cash equivalents.", lastGenerated: null, isAvailable: true },
  { id: "r_eq", name: "Changes in Equity", category: "Financial", description: "Movement in shareholders' equity.", lastGenerated: null, isAvailable: true },
  { id: "r_tb", name: "Trial Balance", category: "Financial", description: "All account balances, debit and credit.", lastGenerated: null, isAvailable: true },
  { id: "r_gl", name: "General Ledger", category: "Financial", description: "Full posting detail by account.", lastGenerated: null, isAvailable: true },
  { id: "r_dpl", name: "Departmental P&L", category: "Management", description: "Profitability by department.", lastGenerated: null, isAvailable: true },
  { id: "r_bva", name: "Budget vs Actual", category: "Management", description: "Variance against budget by line item.", lastGenerated: null, isAvailable: true },
  { id: "r_cust", name: "Profitability by Customer", category: "Management", description: "Revenue and margin per customer.", lastGenerated: null, isAvailable: true },
  { id: "r_vat", name: "VAT Return Summary", category: "Tax", description: "Output and input VAT for the period.", lastGenerated: null, isAvailable: true },
  { id: "r_paye", name: "PAYE Return", category: "Tax", description: "Pay-as-you-earn deductions summary.", lastGenerated: null, isAvailable: true },
  { id: "r_wht", name: "WHT Return", category: "Tax", description: "Withholding tax summary.", lastGenerated: null, isAvailable: true },
  { id: "r_inv", name: "Inventory Valuation", category: "Operational", description: "Stock on hand and value.", lastGenerated: null, isAvailable: true },
  { id: "r_age", name: "Customer Ageing", category: "Operational", description: "Receivables by ageing bucket.", lastGenerated: null, isAvailable: true },
  { id: "r_sage", name: "Supplier Ageing", category: "Operational", description: "Payables by ageing bucket.", lastGenerated: null, isAvailable: true },
  { id: "r_pay", name: "Payroll Summary", category: "Payroll", description: "Gross, deductions, and net by run.", lastGenerated: null, isAvailable: true },
  { id: "r_stat", name: "Statutory Deductions", category: "Payroll", description: "NSSF, SDL, WCF, PAYE totals.", lastGenerated: null, isAvailable: true },
];

export default function ReportsCenterPage() {
  const [generating, setGenerating] = useState<string | null>(null);

  async function generate(r: Report) {
    setGenerating(r.id);
    await new Promise((resolve) => setTimeout(resolve, 1400));
    setGenerating(null);
    toast.success(`${r.name} ready · downloaded`);
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Reports Centre"
        subtitle={`${REPORTS.length} report templates across ${CATEGORY_ORDER.length} categories`}
      />
      {CATEGORY_ORDER.map((cat) => {
        const reports = REPORTS.filter((r) => r.category === cat);
        if (reports.length === 0) return null;
        return (
          <section key={cat} className="mb-8 last:mb-0">
            <h2 className="font-display font-bold text-lg mb-3">{cat}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {reports.map((r) => (
                <div key={r.id} className="bg-white border border-ud-border rounded-2xl p-4 hover:border-ud-primary hover:shadow-card-hover transition-all">
                  <div className="flex items-start gap-2.5 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-ud-primary-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-ud-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{r.name}</div>
                      <div className="text-xs text-ud-text-muted line-clamp-2">{r.description}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-ud-text-muted">
                    {r.lastGenerated ? `Last generated ${fromNow(r.lastGenerated + "T00:00:00")}` : "Never generated"}
                  </div>
                  <div className="mt-3 flex gap-1.5">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => generate(r)}
                      loading={generating === r.id}
                      icon={!generating ? <Download className="w-3 h-3" /> : undefined}
                      className="flex-1"
                    >
                      {generating === r.id ? "Generating…" : "Generate"}
                    </Button>
                    {cat === "Financial" && (
                      <Button size="sm" variant="outline" icon={<ShieldCheck className="w-3 h-3" />} aria-label="Apply stamp" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </PageWrapper>
  );
}
