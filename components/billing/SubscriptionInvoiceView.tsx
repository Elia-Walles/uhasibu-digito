"use client";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Download, Check, ArrowLeft, Building2, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatTZS } from "@/lib/utils/currency";
import { PLATFORM_BANK, PLATFORM_SELLER } from "@/lib/config/billing";
import { useT } from "@/lib/hooks/useT";
import type { SubscriptionInvoiceView as Invoice } from "@/types/billing";

function fmt(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

interface Props {
  invoice: Invoice;
  onDone?: () => void;
  onBack?: () => void;
  submitting?: boolean;
  doneLabel?: string;
}

/**
 * On-screen bank-transfer invoice: brand header, bill-to, plan line, total, bank details, due date,
 * and Download-PDF / Done actions. Shared by the onboarding payment step and /select-plan.
 */
export function SubscriptionInvoiceView({ invoice, onDone, onBack, submitting, doneLabel }: Props) {
  const t = useT();
  const reduce = useReducedMotion();
  const amount = formatTZS(invoice.amountTzs);
  const pdfUrl = `/api/billing/subscription-invoice/${invoice.id}/pdf`;

  const bankRows: [string, string][] = [
    [t("Bank name"), PLATFORM_BANK.bankName],
    [t("Account name"), PLATFORM_BANK.accountName],
    [t("Account number"), PLATFORM_BANK.accountNumber],
    [t("Account type"), PLATFORM_BANK.accountType],
    [t("Bank type"), PLATFORM_BANK.bankType],
    [t("Payment reference"), invoice.number],
  ];

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <div className="rounded-3xl border border-ud-border bg-ud-surface shadow-elevated overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 sm:p-8 border-b border-ud-border">
          <div className="flex items-center gap-3">
            <Image src="/images/uhasibu-digito-circle.png" alt="Uhasibu Digito" width={44} height={44} className="w-11 h-11 rounded-xl" />
            <div>
              <p className="font-display font-extrabold text-ud-text-primary leading-tight">{PLATFORM_SELLER.name}</p>
              <p className="text-xs text-ud-primary">{PLATFORM_SELLER.tagline}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-extrabold text-ud-primary">{t("INVOICE")}</p>
            <p className="text-xs text-ud-text-muted font-mono mt-0.5">{invoice.number}</p>
            <div className="mt-1.5 flex justify-end">
              {invoice.status === "paid" ? (
                <Badge variant="success">{t("Paid")}</Badge>
              ) : invoice.status === "cancelled" ? (
                <Badge variant="default">{t("Cancelled")}</Badge>
              ) : (
                <Badge variant="warning">{t("Unpaid")}</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Bill-to + dates */}
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ud-text-muted mb-1.5">{t("Bill to")}</p>
              <p className="font-medium text-ud-text-primary flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-ud-text-muted" /> {invoice.billToCompany}
              </p>
              {invoice.billToName && <p className="text-sm text-ud-text-secondary">{invoice.billToName}</p>}
              {invoice.billToEmail && <p className="text-sm text-ud-text-muted">{invoice.billToEmail}</p>}
            </div>
            <div className="sm:text-right space-y-1">
              <div className="flex sm:justify-end gap-2 text-sm">
                <span className="text-ud-text-muted">{t("Issue date")}:</span>
                <span className="text-ud-text-primary">{fmt(invoice.issuedAt)}</span>
              </div>
              <div className="flex sm:justify-end gap-2 text-sm">
                <span className="text-ud-text-muted">{t("Due date")}:</span>
                <span className="font-medium text-ud-danger inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {fmt(invoice.dueAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Line item */}
          <div className="rounded-xl border border-ud-border overflow-hidden">
            <div className="flex items-center justify-between bg-ud-obsidian text-white text-xs font-semibold uppercase tracking-[0.06em] px-4 py-2.5">
              <span>{t("Description")}</span>
              <span>{t("Amount")}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-ud-text-primary">{t(invoice.planName)} {t("plan")}</p>
                <p className="text-xs text-ud-text-muted">{t("Uhasibu Digito subscription")} · 1 {t(invoice.billingInterval)}</p>
              </div>
              <span className="font-mono tabular-nums text-ud-text-primary">{amount}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-ud-border bg-ud-surface-2">
              <span className="font-display font-bold text-ud-text-primary">{t("Total due")}</span>
              <span className="font-mono tabular-nums font-display font-extrabold text-ud-primary text-lg">{amount}</span>
            </div>
          </div>

          {/* Bank transfer block */}
          <div className="rounded-xl border border-ud-border bg-ud-surface-3 p-4 sm:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ud-text-primary mb-3">{t("Pay by bank transfer")}</p>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {bankRows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 border-b border-dashed border-ud-border pb-2">
                  <dt className="text-ud-text-muted">{label}</dt>
                  <dd className="font-medium text-ud-text-primary text-right">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-ud-text-muted">
              {t("Use your invoice number as the payment reference. Your account is activated once we confirm your payment.")}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
            <a href={pdfUrl} download={`${invoice.number}.pdf`} rel="noopener noreferrer" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" fullWidth icon={<Download className="w-4 h-4" />}>
                {t("Download PDF")}
              </Button>
            </a>
            {onDone && (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={!!submitting}
                onClick={onDone}
                icon={!submitting ? <Check className="w-4 h-4" /> : undefined}
                className="sm:ml-auto"
              >
                {submitting ? t("Sending…") : (doneLabel ?? t("Done"))}
              </Button>
            )}
          </div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-sm text-ud-text-muted hover:text-ud-text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> {t("Back to plans")}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
