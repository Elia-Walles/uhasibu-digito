"use client";
import { useCallback, useEffect, useState } from "react";
import { CRM_BACKEND_ENABLED } from "@/lib/flags";
import { useDataStore } from "@/lib/store/dataStore";
import {
  listDeals,
  createDeal as createAction,
  moveDeal as moveDealAction,
} from "@/lib/server/actions/crm";
import { ok, type Result } from "@/lib/server/result";
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
  const mockDeals = useDataStore((s) => s.deals);
  const mockAdd = useDataStore((s) => s.addDeal);
  const mockMove = useDataStore((s) => s.moveDeal);

  const [serverDeals, setServerDeals] = useState<PipelineDeal[]>([]);
  const [loading, setLoading] = useState(CRM_BACKEND_ENABLED);

  const refresh = useCallback(async () => {
    if (!CRM_BACKEND_ENABLED) return;
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

  if (!CRM_BACKEND_ENABLED) {
    return {
      deals: mockDeals,
      loading: false,
      addDeal: async (deal) => {
        mockAdd(deal);
        return ok(deal);
      },
      moveDeal: async (id, stage) => {
        mockMove(id, stage);
        return ok({ id, stage });
      },
    };
  }

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
