"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listAssets,
  createAsset as createAction,
  disposeAsset as disposeAction,
} from "@/lib/server/actions/fixed-assets";
import { type Result } from "@/lib/server/result";
import type { FixedAsset } from "@/types";

export interface UseFixedAssets {
  assets: FixedAsset[];
  loading: boolean;
  addAsset: (a: FixedAsset) => Promise<Result<FixedAsset>>;
  disposeAsset: (id: string, proceeds: number, date: string) => Promise<Result<{ id: string; gainLoss: number }>>;
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
  };
}
