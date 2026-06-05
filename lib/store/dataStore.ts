import { create } from "zustand";
import type { ModelAssumptions } from "@/types";

// Client-only state for the Financial Modeling page's planning assumptions. (All business
// data lives in the backend and is read through the domain hooks.)
const DEFAULT_ASSUMPTIONS: ModelAssumptions = {
  scenario: "Base",
  inflationRate: 0.035,
  fxTzsPerUsd: 2580,
  revenueGrowth: 0.12,
  grossMarginTarget: 0.5,
  opexGrowth: 0.08,
  capexAnnual: 0,
  taxRate: 0.3,
  primaryProducts: "",
};

interface DataState {
  modelAssumptions: ModelAssumptions;
  updateAssumptions: (patch: Partial<ModelAssumptions>) => void;
}

export const useDataStore = create<DataState>((set) => ({
  modelAssumptions: DEFAULT_ASSUMPTIONS,
  updateAssumptions: (patch) => set((s) => ({ modelAssumptions: { ...s.modelAssumptions, ...patch } })),
}));
