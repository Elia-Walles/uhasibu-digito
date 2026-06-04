"use client";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store/appStore";
import { useTaxFilings } from "@/lib/hooks/useTaxFilings";
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
  const { taxFilings } = useTaxFilings();

  useEffect(() => {
    const now = new Date().toISOString();
    for (const filing of taxFilings) {
      if (filing.status === "Filed") continue;
      const days = daysUntil(filing.dueDate);
      if (days < 0 || days > REMINDER_WINDOW_DAYS) continue;
      addNotification({
        id: `tax-reminder-${filing.id}`,
        type: "warning",
        title: `${filing.type} filing due in ${days} day${days === 1 ? "" : "s"}`,
        message: `Period: ${filing.period} · ${formatTZS(filing.amount, true)} payable`,
        timestamp: now,
        read: false,
        link: TAX_LINKS[filing.type] ?? "/tax/calendar",
      });
    }
  }, [taxFilings, addNotification]);

  return null;
}
