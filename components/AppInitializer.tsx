"use client";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store/appStore";
import { TAX_FILINGS } from "@/lib/mock-data/tax";
import { daysUntil } from "@/lib/utils/dates";
import { formatTZS } from "@/lib/utils/currency";

const REMINDER_WINDOW_DAYS = 5;

const TAX_LINKS: Record<string, string> = {
  VAT:  "/tax/vat-returns",
  PAYE: "/tax/paye",
  SDL:  "/tax/calendar",
  WCF:  "/tax/calendar",
  CIT:  "/tax/calendar",
  WHT:  "/tax/calendar",
};

export function AppInitializer() {
  const addNotification = useAppStore((s) => s.addNotification);
  const notifications   = useAppStore((s) => s.notifications);

  useEffect(() => {
    const existing = new Set(notifications.map((n) => n.id));
    const now = new Date().toISOString();

    for (const filing of TAX_FILINGS) {
      if (filing.status === "Filed") continue;
      const days = daysUntil(filing.dueDate);
      if (days < 0 || days > REMINDER_WINDOW_DAYS) continue;

      const id = `tax-reminder-${filing.id}`;
      if (existing.has(id)) continue;

      addNotification({
        id,
        type: "warning",
        title: `${filing.type} filing due in ${days} day${days === 1 ? "" : "s"}`,
        message: `Period: ${filing.period} · ${formatTZS(filing.amount, true)} payable`,
        timestamp: now,
        read: false,
        link: TAX_LINKS[filing.type] ?? "/tax/calendar",
      });
    }
    // notifications intentionally read once on mount — we don't want to re-evaluate every dispatch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
