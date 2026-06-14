"use client";
import { useCallback, useEffect, useState } from "react";
import { getPlatformOverview } from "@/lib/server/actions/admin/overview";
import type { PlatformOverview } from "@/lib/server/actions/admin/types";

export function useAdminOverview() {
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setOverview(await getPlatformOverview());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  return { overview, loading, refresh };
}
