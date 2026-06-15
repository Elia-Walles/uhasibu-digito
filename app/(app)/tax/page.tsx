"use client";
import Link from "next/link";
import { Calendar, AlertTriangle, CheckCircle2, Clock, FileSpreadsheet } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { Button } from "@/components/ui/Button";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { useTaxFilings } from "@/lib/hooks/useTaxFilings";
import { useT } from "@/lib/hooks/useT";
import { formatDate, daysUntil } from "@/lib/utils/dates";

export default function TaxCenterPage() {
  const tr = useT();
  const { taxFilings, loading: taxLoading } = useTaxFilings();
  const loading = taxLoading;
  const upcoming = taxFilings.filter((t) => t.status !== "Filed");

  return (
    <PageWrapper>
      <PageHeader
        title="Tax Compliance"
        subtitle="TRA filings, VAT returns, PAYE, and corporate tax"
        actions={
          <>
            <Link href="/tax/calendar"><Button variant="outline" icon={<Calendar className="w-4 h-4" />}>{tr("Calendar")}</Button></Link>
            <Link href="/tax/vat-returns"><Button variant="primary" icon={<FileSpreadsheet className="w-4 h-4" />}>{tr("File VAT")}</Button></Link>
          </>
        }
      />

      {loading ? <CardGridSkeleton count={6} cols={3} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {taxFilings.slice(0, 6).map((t) => {
            const overdue = t.status === "Overdue";
            const pending = t.status === "Pending";
            const days = daysUntil(t.dueDate);
            return (
              <div key={t.id} className={`bg-white border rounded-2xl p-5 shadow-card ${overdue ? "border-ud-danger/30" : pending ? "border-ud-warning/30" : "border-ud-border"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="font-display font-bold text-lg">{t.type}</div>
                  <Badge variant={
                    overdue ? "danger" :
                    pending ? "warning" :
                    t.status === "Filed" ? "success" : "info"
                  } pulse={overdue}>
                    {t.status === "Filed" ? <><CheckCircle2 className="w-2.5 h-2.5" />{tr("Filed")}</> :
                     overdue ? <><AlertTriangle className="w-2.5 h-2.5" />{tr("Overdue")}</> :
                     <><Clock className="w-2.5 h-2.5" />{tr(t.status)}</>}
                  </Badge>
                </div>
                <div className="text-xs text-ud-text-muted">{t.period}</div>
                <div className="mt-3 font-mono font-bold text-xl"><CurrencyDisplay amount={t.amount} /></div>
                <div className="mt-3 pt-3 border-t border-ud-border text-xs flex justify-between">
                  <span className="text-ud-text-muted">{tr("Due {date}", { date: formatDate(t.dueDate) })}</span>
                  <span className={overdue ? "text-ud-danger font-medium" : "text-ud-text-secondary"}>
                    {days >= 0 ? tr("{days} days left", { days }) : tr("{days} days overdue", { days: Math.abs(days) })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Link href="/tax/vat-returns" className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-ud-border hover:border-ud-primary transition-colors">
          <div className="w-10 h-10 rounded-xl bg-ud-primary-50 flex items-center justify-center"><FileSpreadsheet className="w-4 h-4 text-ud-primary" /></div>
          <div><div className="font-medium">{tr("VAT Returns")}</div><div className="text-xs text-ud-text-muted">{tr("Monthly Output/Input")}</div></div>
        </Link>
        <Link href="/tax/paye" className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-ud-border hover:border-ud-primary transition-colors">
          <div className="w-10 h-10 rounded-xl bg-ud-primary-50 flex items-center justify-center"><FileSpreadsheet className="w-4 h-4 text-ud-primary" /></div>
          <div><div className="font-medium">{tr("PAYE Returns")}</div><div className="text-xs text-ud-text-muted">{tr("Employee tax filing")}</div></div>
        </Link>
        <Link href="/tax/calendar" className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-ud-border hover:border-ud-primary transition-colors">
          <div className="w-10 h-10 rounded-xl bg-ud-primary-50 flex items-center justify-center"><Calendar className="w-4 h-4 text-ud-primary" /></div>
          <div><div className="font-medium">{tr("Tax Calendar")}</div><div className="text-xs text-ud-text-muted">{tr("All upcoming deadlines")}</div></div>
        </Link>
      </div>

      {upcoming.length > 0 && (
        <div className="mt-6 p-4 rounded-2xl bg-ud-warning-bg border border-ud-warning/20">
          <div className="text-sm font-bold text-ud-warning mb-1">{tr("{count} filings need your attention", { count: upcoming.length })}</div>
          <div className="text-xs text-ud-text-secondary">{tr("Stay on top of TRA deadlines to avoid penalties. File early.")}</div>
        </div>
      )}
    </PageWrapper>
  );
}
