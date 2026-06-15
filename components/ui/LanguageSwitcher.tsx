"use client";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Globe, Check } from "lucide-react";
import { useLocale } from "@/lib/hooks/useT";
import { LOCALES } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";

interface LanguageSwitcherProps {
  /** "light" for white headers (default), "dark" for obsidian headers. */
  variant?: "light" | "dark";
  className?: string;
}

/** Globe-icon dropdown to switch between English and Kiswahili. Visible in every header. */
export function LanguageSwitcher({ variant = "light", className }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocale();
  const active = LOCALES.find((l) => l.code === locale) ?? LOCALES[0]!;

  const trigger =
    variant === "dark"
      ? "text-white/70 hover:bg-white/10 hover:text-white"
      : "text-ud-text-secondary hover:bg-ud-surface-2 hover:text-ud-text-primary";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-primary",
            trigger,
            className,
          )}
          aria-label="Change language"
        >
          <Globe className="w-4 h-4" />
          <span className="text-xs font-semibold tabular-nums">{active.short}</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[10rem] bg-white rounded-xl shadow-elevated border border-ud-border overflow-hidden p-1"
        >
          {LOCALES.map((l) => (
            <DropdownMenu.Item
              key={l.code}
              onSelect={() => setLocale(l.code)}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm text-ud-text-primary cursor-pointer outline-none data-[highlighted]:bg-ud-surface-2"
            >
              {l.label}
              {l.code === locale && <Check className="w-4 h-4 text-ud-primary" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
