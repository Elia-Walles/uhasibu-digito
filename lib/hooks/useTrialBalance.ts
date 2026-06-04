"use client";
import { useEffect, useState } from "react";
import { getTrialBalance, type TrialBalanceView } from "@/lib/server/actions/statements";

export function useTrialBalance(): { data: TrialBalanceView | null; loading: boolean } {
  const [data, setData] = useState<TrialBalanceView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getTrialBalance().then((d) => {
      if (!active) return;
      setData(d);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { data, loading };
}
