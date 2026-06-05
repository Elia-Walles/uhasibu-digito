"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listDeals,
  createDeal as createAction,
  moveDeal as moveDealAction,
} from "@/lib/server/actions/crm";
import { type Result } from "@/lib/server/result";
import type { PipelineDeal, DealStage } from "@/types";

export interface UsePipelineDeals {
  deals: PipelineDeal[];
  loading: boolean;
  addDeal: (deal: PipelineDeal) => Promise<Result<PipelineDeal>>;
  moveDeal: (id: string, stage: DealStage) => Promise<Result<{ id: string; stage: DealStage }>>;
}

function toCreateInput(d: PipelineDeal) {
  return {
    dealName: d.dealName,
    companyName: d.companyName,
    contactName: d.contactName,
    value: d.value,
    probability: d.probability,
    stage: d.stage,
    assignedTo: d.assignedTo,
    assignedInitials: d.assignedInitials,
    expectedCloseDate: d.expectedCloseDate,
    daysInStage: d.daysInStage,
    notes: d.notes,
  };
}

export function usePipelineDeals(): UsePipelineDeals {
  const [serverDeals, setServerDeals] = useState<PipelineDeal[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setServerDeals(await listDeals());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  return {
    deals: serverDeals,
    loading,
    addDeal: async (deal) => {
      const r = await createAction(toCreateInput(deal));
      if (r.ok) await refresh();
      return r;
    },
    moveDeal: async (id, stage) => {
      const r = await moveDealAction({ id, stage });
      if (r.ok) await refresh();
      return r;
    },
  };
}
