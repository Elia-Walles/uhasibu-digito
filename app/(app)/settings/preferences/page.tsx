"use client";
import { Select } from "@/components/ui/Select";

export default function PreferencesPage() {
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
      <Card title="Notifications" description="What you'd like to be notified about">
        <Select options={[
          { value: "all", label: "All activity" },
          { value: "mentions", label: "Mentions and direct only" },
          { value: "critical", label: "Critical alerts only" },
        ]} value="critical" />
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
