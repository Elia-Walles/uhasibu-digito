"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listAssets,
  createAsset as createAction,
  disposeAsset as disposeAction,
  runDepreciation as runDepreciationAction,
} from "@/lib/server/actions/fixed-assets";
import { type Result } from "@/lib/server/result";
import type { FixedAsset } from "@/types";

export interface UseFixedAssets {
  assets: FixedAsset[];
  loading: boolean;
  refresh: () => Promise<void>;
  addAsset: (a: FixedAsset) => Promise<Result<FixedAsset>>;
  disposeAsset: (id: string, proceeds: number, date: string) => Promise<Result<{ id: string; gainLoss: number }>>;
  runDepreciation: (period: string) => Promise<Result<{ period: string; amount: number; assets: number }>>;
}

function toCreateInput(a: FixedAsset) {
  return {
    code: a.code,
    name: a.name,
    category: a.category,
    location: a.location,
    acquisitionDate: a.acquisitionDate,
    cost: a.cost,
    residualValue: a.residualValue,
    usefulLifeYears: a.usefulLifeYears,
    depreciationMethod: a.depreciationMethod,
  };
}

export function useFixedAssets(): UseFixedAssets {
  const [serverAssets, setServerAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setServerAssets(await listAssets());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  return {
    assets: serverAssets,
    loading,
    refresh,
    addAsset: async (a) => {
      const r = await createAction(toCreateInput(a));
      if (r.ok) await refresh();
      return r;
    },
    disposeAsset: async (id, proceeds, date) => {
      const r = await disposeAction({ id, proceeds, date });
      if (r.ok) await refresh();
      return r;
    },
    runDepreciation: async (period) => {
      const r = await runDepreciationAction({ period });
      if (r.ok) await refresh();
      return r;
    },
  };
}
