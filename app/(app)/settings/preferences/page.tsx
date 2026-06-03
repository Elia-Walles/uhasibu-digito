"use client";
import { Mail } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { useAppStore } from "@/lib/store/appStore";
import type { InvoiceStatus } from "@/types";

const INVOICE_STATUSES: InvoiceStatus[] = ["Draft", "Sent", "Paid", "Overdue", "Cancelled"];

export default function PreferencesPage() {
  const emailPrefs = useAppStore((s) => s.emailNotifications);
  const setEmailNotification = useAppStore((s) => s.setEmailNotification);

  return (
    <div className="bg-white border border-ud-border rounded-2xl p-6 shadow-card space-y-5">
      <h2 className="font-display font-bold text-lg">Preferences</h2>
      <Card title="Localization" description="Language and currency display">
        <Select label="Interface language" options={[{ value: "en", label: "English" }, { value: "sw", label: "Kiswahili" }]} value="en" />
        <Select label="Currency display" options={[{ value: "tzs", label: "TZS (Tanzanian Shilling)" }, { value: "usd", label: "USD (US Dollar)" }]} value="tzs" />
        <Select label="Number format" options={[{ value: "tz", label: "1,234,567 (English)" }, { value: "sw", label: "1.234.567 (European)" }]} value="tz" />
      </Card>
      <Card title="Display density" description="How much information shows per screen">
        <Select options={[{ value: "comfortable", label: "Comfortable" }, { value: "compact", label: "Compact" }]} value="comfortable" />
      </Card>
      <Card title="Invoice email notifications" description="Trigger a customer email when an invoice changes to one of these statuses">
        <div className="space-y-2">
          {INVOICE_STATUSES.map((status) => (
            <label key={status} className="flex items-center justify-between p-3 rounded-xl border border-ud-border hover:border-ud-primary/40 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-ud-text-muted" />
                <div>
                  <div className="text-sm font-medium">{status}</div>
                  <div className="text-xs text-ud-text-muted">
                    {status === "Sent"      ? "Email customer when an invoice is sent" :
                     status === "Paid"      ? "Email customer when a payment is recorded" :
                     status === "Overdue"   ? "Email customer when an invoice becomes overdue" :
                     status === "Cancelled" ? "Email customer when an invoice is cancelled" :
                                              "Email customer when a draft is created (rare)"}
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={emailPrefs[status]}
                onChange={(e) => setEmailNotification(status, e.target.checked)}
                className="w-4 h-4 rounded border-ud-border text-ud-primary focus:ring-ud-primary"
              />
            </label>
          ))}
        </div>
        <p className="text-xs text-ud-text-muted mt-2">
          Demo behaviour: when a matching status change happens on the Invoices page, an in-app notification is
          pushed and a toast confirms the (simulated) email send. No real email leaves this app.
        </p>
      </Card>
    </div>
  );
}

function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 pb-5 border-b border-ud-border last:border-b-0 last:pb-0">
      <div>
        <h3 className="font-medium text-sm">{title}</h3>
        <p className="text-xs text-ud-text-muted mt-0.5">{description}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
