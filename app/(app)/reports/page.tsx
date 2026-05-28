"use client";
import { useState } from "react";
import { FileText, Download, ShieldCheck } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { REPORTS } from "@/lib/mock-data/reports";
import { fromNow } from "@/lib/utils/dates";
import type { Report, ReportCategory } from "@/types";
import toast from "react-hot-toast";

const CATEGORY_ORDER: ReportCategory[] = ["Financial", "Management", "Tax", "Operational", "Payroll"];

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
