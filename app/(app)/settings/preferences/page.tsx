"use client";
import { Mail } from "lucide-react";
import { useSession } from "next-auth/react";
import { Select } from "@/components/ui/Select";
import { Avatar } from "@/components/ui/Avatar";
import { FileUpload } from "@/components/ui/FileUpload";
import { useAppStore } from "@/lib/store/appStore";
import { useT } from "@/lib/hooks/useT";
import type { InvoiceStatus } from "@/types";

const INVOICE_STATUSES: InvoiceStatus[] = ["Draft", "Sent", "Paid", "Overdue", "Cancelled"];

export default function PreferencesPage() {
  const t = useT();
  const emailPrefs = useAppStore((s) => s.emailNotifications);
  const setEmailNotification = useAppStore((s) => s.setEmailNotification);
  const { data: session, update } = useSession();
  const user = session?.user;
  const initials = (user?.name ?? "U").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="bg-white border border-ud-border rounded-2xl p-6 shadow-card space-y-5">
      <h2 className="font-display font-bold text-lg">{t("Preferences")}</h2>
      <Card title={t("Profile photo")} description={t("Shown across the app in place of your initials")}>
        <div className="flex items-center gap-4">
          <Avatar initials={initials} src={user?.image ?? null} size="xl" />
          <FileUpload
            purpose="avatar"
            accept="image/*"
            label={user?.image ? t("Replace photo") : t("Upload photo")}
            onUploaded={(r) => void update({ image: r.url })}
          />
        </div>
      </Card>
      <Card title={t("Localization")} description={t("Language and currency display")}>
        <Select label={t("Interface language")} options={[{ value: "en", label: "English" }, { value: "sw", label: "Kiswahili" }]} value="en" />
        <Select label={t("Currency display")} options={[{ value: "tzs", label: "TZS (Tanzanian Shilling)" }, { value: "usd", label: "USD (US Dollar)" }]} value="tzs" />
        <Select label={t("Number format")} options={[{ value: "tz", label: "1,234,567 (English)" }, { value: "sw", label: "1.234.567 (European)" }]} value="tz" />
      </Card>
      <Card title={t("Display density")} description={t("How much information shows per screen")}>
        <Select options={[{ value: "comfortable", label: "Comfortable" }, { value: "compact", label: "Compact" }]} value="comfortable" />
      </Card>
      <Card title={t("Invoice email notifications")} description={t("Trigger a customer email when an invoice changes to one of these statuses")}>
        <div className="space-y-2">
          {INVOICE_STATUSES.map((status) => (
            <label key={status} className="flex items-center justify-between p-3 rounded-xl border border-ud-border hover:border-ud-primary/40 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-ud-text-muted" />
                <div>
                  <div className="text-sm font-medium">{t(status)}</div>
                  <div className="text-xs text-ud-text-muted">
                    {status === "Sent"      ? t("Email customer when an invoice is sent") :
                     status === "Paid"      ? t("Email customer when a payment is recorded") :
                     status === "Overdue"   ? t("Email customer when an invoice becomes overdue") :
                     status === "Cancelled" ? t("Email customer when an invoice is cancelled") :
                                              t("Email customer when a draft is created (rare)")}
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
          {t("When a matching status change happens on the Invoices page, the customer is emailed via your configured SMTP server and an in-app notification is pushed.")}
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
