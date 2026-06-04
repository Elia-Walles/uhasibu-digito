"use client";
import { useEffect, useState } from "react";
import { getStatements, type PeriodView, type StatementPeriod } from "@/lib/server/actions/statements";

export function useStatements(period: StatementPeriod): { view: PeriodView | null; loading: boolean } {
  const [view, setView] = useState<PeriodView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void getStatements(period).then((v) => {
      if (!active) return;
      setView(v);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [period]);

  return { view, loading };
}
