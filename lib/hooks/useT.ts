"use client";
import { useCallback } from "react";
import { useAppStore } from "@/lib/store/appStore";
import { translate, type TParams } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/config";

/** The active locale + a setter. Subscribes to the store so consumers re-render on change. */
export function useLocale(): { locale: Locale; setLocale: (l: Locale) => void } {
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  return { locale, setLocale };
}

/**
 * Returns a `t(englishSource, params?)` translator bound to the active locale.
 * Subscribing to `locale` means every component using `useT` re-renders when the
 * user switches language. English is the source key; missing Swahili falls back to it.
 */
export function useT(): (key: string, params?: TParams) => string {
  const locale = useAppStore((s) => s.locale);
  return useCallback((key: string, params?: TParams) => translate(key, locale, params), [locale]);
}
