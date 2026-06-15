"use client";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { useTaxFilings } from "@/lib/hooks/useTaxFilings";
import { useT } from "@/lib/hooks/useT";
import { formatDate, daysUntil } from "@/lib/utils/dates";
import toast from "react-hot-toast";

export default function TaxCalendarPage() {
  const tr = useT();
  const { taxFilings, markFiled } = useTaxFilings();
  const sorted = [...taxFilings].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  async function onMarkFiled(id: string, label: string) {
    const res = await markFiled(id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(tr("{label} marked as filed", { label }));
  }
  return (
    <PageWrapper>
      <PageHeader
        title="Tax Calendar"
        subtitle="All filings, deadlines, and status per TRA filing requirements (chronological)"
        breadcrumbs={[{ label: "Tax", href: "/tax" }, { label: "Calendar" }]}
      />
      <div className="mb-4 px-4 py-3 rounded-xl bg-ud-primary-50/60 border border-ud-primary/15 text-xs text-ud-text-secondary leading-relaxed">
        {tr("Filing cadence reflects current Tanzania Revenue Authority requirements: VAT (20th of the following month), PAYE / SDL / WCF (7th of the following month), CIT provisional (quarter-end), Withholding Tax (mid-month). Reminders for filings due within five days appear in your notifications automatically.")}
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
                    <Badge variant={variant} size="sm">{tr(t.status)}</Badge>
                  </div>
                  <div className="text-xs text-ud-text-muted mt-0.5">{t.period}</div>
                </div>
                <div className="text-right">
                  <CurrencyDisplay amount={t.amount} compact className="font-bold" />
                  <div className="text-xs text-ud-text-muted">
                    {days >= 0 ? tr("in {days}d", { days }) : tr("{days}d overdue", { days: Math.abs(days) })}
                  </div>
                </div>
                {t.status !== "Filed" && (
                  <Button size="sm" variant="outline" onClick={() => void onMarkFiled(t.id, `${t.type} ${t.period}`)}>
                    {tr("Mark filed")}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PageWrapper>
  );
}
