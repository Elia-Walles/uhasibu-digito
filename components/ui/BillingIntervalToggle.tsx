"use client";

import * as SwitchPrimitives from "@radix-ui/react-switch";
import { ANNUAL_DISCOUNT_PERCENT, type BillingInterval } from "@/lib/auth/tiers";
import { useT } from "@/lib/hooks/useT";
import { cn } from "@/lib/utils/cn";

interface BillingIntervalToggleProps {
  interval: BillingInterval;
  onChange: (interval: BillingInterval) => void;
  className?: string;
}

function ToggleSwitch(props: React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>) {
  return (
    <SwitchPrimitives.Root
      {...props}
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-primary focus-visible:ring-offset-2",
        "data-[state=checked]:bg-ud-primary data-[state=unchecked]:bg-ud-border",
      )}
    >
      <SwitchPrimitives.Thumb className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
    </SwitchPrimitives.Root>
  );
}

export function BillingIntervalToggle({ interval, onChange, className }: BillingIntervalToggleProps) {
  const t = useT();
  return (
    <div className={cn("flex items-center justify-center gap-4", className)}>
      <div className="flex items-center gap-3 text-sm font-medium">
        <span className={cn(interval !== "year" ? "text-ud-text-primary" : "text-ud-text-muted")}>
          {t("Monthly")}
        </span>
        <ToggleSwitch
          checked={interval === "year"}
          onCheckedChange={(checked) => onChange(checked ? "year" : "month")}
          aria-label="Toggle yearly pricing"
        />
        <span className={cn(interval === "year" ? "text-ud-text-primary" : "text-ud-text-muted")}>
          {t("Yearly")}
        </span>
      </div>
      {interval === "year" && (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-ud-success-bg px-2.5 py-1 text-[11px] font-semibold text-ud-success">
          {t("Save {pct}%", { pct: ANNUAL_DISCOUNT_PERCENT })}
        </div>
      )}
    </div>
  );
}
