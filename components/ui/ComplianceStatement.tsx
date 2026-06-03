"use client";
import { ScrollText } from "lucide-react";

export function ComplianceStatement() {
  return (
    <section
      aria-label="Compliance statement"
      className="mt-6 rounded-2xl border border-ud-border bg-white p-5 shadow-card"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-ud-primary-50 text-ud-primary flex items-center justify-center flex-shrink-0">
          <ScrollText className="w-4 h-4" />
        </div>
        <div className="min-w-0 space-y-3 text-xs leading-relaxed text-ud-text-secondary">
          <p>
            <span className="uppercase tracking-[0.08em] text-[10px] font-semibold text-ud-text-muted block mb-1">
              Basis of preparation
            </span>
            These financial statements have been prepared in accordance with{" "}
            <span className="font-semibold text-ud-text-primary">International Financial Reporting Standards (IFRS)</span>,{" "}
            <span className="font-semibold text-ud-text-primary">International Accounting Standards (IAS)</span>,{" "}
            <span className="font-semibold text-ud-text-primary">IFRS for SMEs</span>, and the{" "}
            <span className="font-semibold text-ud-text-primary">Tanzania Financial Reporting Standards (TFRS)</span> as applicable. They comply with the disclosure requirements of the{" "}
            <span className="font-semibold text-ud-text-primary">National Board of Accountants and Auditors (NBAA)</span> of Tanzania.
          </p>
          <p>
            <span className="uppercase tracking-[0.08em] text-[10px] font-semibold text-ud-text-muted block mb-1">
              Responsibility
            </span>
            The directors are responsible for the preparation and fair presentation of these statements.
            The accountant is responsible for ensuring correctness of the underlying records and the
            mathematical accuracy of the figures presented.
          </p>
        </div>
      </div>
    </section>
  );
}
