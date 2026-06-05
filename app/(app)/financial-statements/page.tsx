"use client";
import Link from "next/link";
import { FileBarChart, Scale, TrendingUp, Wallet } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { ExportMenu } from "@/components/ui/ExportMenu";

const STATEMENTS = [
  { name: "Income Statement",            href: "/financial-statements/income-statement", description: "Profit & loss for the period", icon: TrendingUp,    color: "gradient-teal" },
  { name: "Balance Sheet",               href: "/financial-statements/balance-sheet",    description: "Statement of financial position", icon: Scale,       color: "gradient-emerald" },
  { name: "Cash Flow Statement",         href: "/financial-statements/cash-flow",        description: "Operating, investing, financing", icon: Wallet,        color: "gradient-blue" },
  { name: "Statement of Changes in Equity", href: "/financial-statements/equity",        description: "Equity movements during the period", icon: FileBarChart, color: "gradient-amber" },
];

export default function FinancialStatementsHome() {
  return (
    <PageWrapper>
      <PageHeader
        title="Financial statements"
        subtitle="Income statement, balance sheet, cash flow, and changes in equity"
        actions={<ExportMenu fileLabel="financial statements" />}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {STATEMENTS.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="group bg-white border border-ud-border rounded-2xl p-5 hover:border-ud-primary hover:shadow-card-hover transition-all"
            >
              <div className={`w-12 h-12 rounded-2xl ${s.color} flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-display font-bold text-lg text-ud-text-primary group-hover:text-ud-primary transition-colors">{s.name}</h3>
              <p className="mt-1 text-sm text-ud-text-muted">{s.description}</p>
            </Link>
          );
        })}
      </div>
    </PageWrapper>
  );
}
