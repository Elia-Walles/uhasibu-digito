import type { Locale } from "./config";
import { SW } from "./sw";

export type TParams = Record<string, string | number>;

/**
 * Translate an English source string to the active locale, with English fallback.
 *
 * The English string IS the key: for "en" we return it as-is; for "sw" we look it
 * up in the SW dictionary and fall back to the English source if missing (so the UI
 * never shows a blank or a raw key, and a partial rollout stays fully usable).
 *
 * Supports `{name}` interpolation: translate("Due in {n} days", "sw", { n: 4 }).
 * The brand name and statutory abbreviations (PAYE, NSSF, VAT, TRA, TZS…) are simply
 * absent from SW, so they pass through unchanged in both languages.
 */
export function translate(key: string, locale: Locale, params?: TParams): string {
  const base = locale === "sw" ? SW[key] ?? key : key;
  if (!params) return base;
  return base.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
