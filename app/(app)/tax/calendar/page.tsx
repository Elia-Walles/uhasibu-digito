"use client";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { TAX_FILINGS } from "@/lib/mock-data/tax";
import { formatDate, daysUntil } from "@/lib/utils/dates";

export default function TaxCalendarPage() {
  const sorted = [...TAX_FILINGS].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return (
    <PageWrapper>
      <PageHeader
        title="Tax Calendar"
        subtitle="All filings, deadlines, and status — per TRA filing requirements (chronological)"
        breadcrumbs={[{ label: "Tax", href: "/tax" }, { label: "Calendar" }]}
      />
      <div className="mb-4 px-4 py-3 rounded-xl bg-ud-primary-50/60 border border-ud-primary/15 text-xs text-ud-text-secondary leading-relaxed">
        Filing cadence reflects current Tanzania Revenue Authority requirements: VAT (20th of the
        following month), PAYE / SDL / WCF (7th of the following month), CIT provisional
        (quarter-end), Withholding Tax (mid-month). Reminders for filings due within five days
        appear in your notifications automatically.
      </div>
      <div className="bg-white border border-ud-border rounded-2xl shadow-card overflow-hidden">
        <div className="divide-y divide-ud-border">
          {sorted.map((t) => {
            const days = daysUntil(t.dueDate);
            const variant = t.status === "Filed" ? "success" : t.status === "Overdue" ? "danger" : t.status === "Pending" ? "warning" : "info";
            return (
              <div key={t.id} className="flex items-center gap-4 px-5 py-4">
                <div className="text-center min-w-16">
                  <div className="text-xs uppercase tracking-[0.08em] text-ud-text-muted">{formatDate(t.dueDate).split("/")[1]}/{formatDate(t.dueDate).split("/")[2]}</div>
                  <div className="font-display font-extrabold text-2xl">{formatDate(t.dueDate).split("/")[0]}</div>
                </div>
                <div className="w-px h-12 bg-ud-border" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold">{t.type}</span>
                    <Badge variant={variant} size="sm">{t.status}</Badge>
                  </div>
                  <div className="text-xs text-ud-text-muted mt-0.5">{t.period}</div>
                </div>
                <div className="text-right">
                  <CurrencyDisplay amount={t.amount} compact className="font-bold" />
                  <div className="text-xs text-ud-text-muted">
                    {days >= 0 ? `in ${days}d` : `${Math.abs(days)}d overdue`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageWrapper>
  );
}
