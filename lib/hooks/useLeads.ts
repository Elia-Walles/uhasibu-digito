"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listLeads,
  createLead as createAction,
  updateLeadStatus as updateStatusAction,
} from "@/lib/server/actions/crm";
import { type Result } from "@/lib/server/result";
import type { Lead, LeadStatus } from "@/types";

export interface UseLeads {
  leads: Lead[];
  loading: boolean;
  addLead: (lead: Lead) => Promise<Result<Lead>>;
  updateLeadStatus: (id: string, status: LeadStatus) => Promise<Result<{ id: string; status: LeadStatus }>>;
}

function toCreateInput(l: Lead) {
  return {
    name: l.name,
    company: l.company,
    phone: l.phone,
    email: l.email,
    source: l.source,
    status: l.status,
    temperature: l.temperature,
    assignedTo: l.assignedTo,
    expectedValue: l.expectedValue,
    followUpDate: l.followUpDate,
  };
}

export function useLeads(): UseLeads {
  const [serverLeads, setServerLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setServerLeads(await listLeads());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  return {
    leads: serverLeads,
    loading,
    addLead: async (lead) => {
      const r = await createAction(toCreateInput(lead));
      if (r.ok) await refresh();
      return r;
    },
    updateLeadStatus: async (id, status) => {
      const r = await updateStatusAction({ id, status });
      if (r.ok) await refresh();
      return r;
    },
  };
}
