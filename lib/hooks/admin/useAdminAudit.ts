"use client";
import { useCallback, useEffect, useState } from "react";
import { listPlatformAudit } from "@/lib/server/actions/admin/audit";
import type { AdminAuditRow } from "@/lib/server/actions/admin/types";

export function useAdminAudit() {
  const [entries, setEntries] = useState<AdminAuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await listPlatformAudit());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  return { entries, loading, refresh };
}
