/**
 * Backend module feature flags.
 *
 * During the wave-by-wave migration, each module flips from the in-memory Zustand
 * mock to the real backend independently. `NEXT_PUBLIC_BACKEND_ENABLED_MODULES` is a
 * comma-separated list (e.g. "auth,departments") inlined at build time, so these are
 * client-safe constants. With the flag empty (the default) every module stays on the
 * mock and the demo runs unchanged.
 */
const RAW = process.env.NEXT_PUBLIC_BACKEND_ENABLED_MODULES ?? "";

const ENABLED_MODULES: ReadonlySet<string> = new Set(
  RAW.split(",")
    .map((m) => m.trim())
    .filter(Boolean),
);

export function isModuleEnabled(module: string): boolean {
  return ENABLED_MODULES.has(module);
}

// Auth is permanently live (no mock fallback). Per-domain backend flags below gate
// the remaining wave-by-wave cutovers.
export const DEPARTMENTS_BACKEND_ENABLED = isModuleEnabled("departments");
export const CUSTOMERS_BACKEND_ENABLED = isModuleEnabled("customers");
export const INVOICES_BACKEND_ENABLED = isModuleEnabled("invoices");
// "gl" covers the whole compound GL+Banking wave (COA, GL, journal, bank, reconciliation)
// — they flip together because posting a journal writes both ledgers atomically.
export const LEDGER_BACKEND_ENABLED = isModuleEnabled("gl");
