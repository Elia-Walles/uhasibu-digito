// i18n configuration. The app is bilingual: English (default) + Swahili.
export type Locale = "en" | "sw";

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALES: { code: Locale; label: string; short: string }[] = [
  { code: "en", label: "English", short: "EN" },
  { code: "sw", label: "Kiswahili", short: "SW" },
];

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "sw";
}
