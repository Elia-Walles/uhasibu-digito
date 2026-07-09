"use client";
import { useMemo, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { motion } from "framer-motion";
import { Check, ChevronDown, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { useT } from "@/lib/hooks/useT";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { cn } from "@/lib/utils/cn";

export interface SearchableOption {
  value: string;
  label: string;
  leading?: React.ReactNode;
  /** Compact text shown in the trigger when selected (defaults to `label`). */
  triggerLabel?: string;
}

interface SearchableSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: SearchableOption[];
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  disabled?: boolean;
  allowOther?: boolean;
  className?: string;
}

const OTHER_LABEL = "Other";

/**
 * Searchable, alphabetically-sorted dropdown built on Radix Popover to match the plain Select's look.
 * Supports an optional "Other" free-text escape hatch: picking it reveals an inline input whose text
 * becomes the value (a value not present in `options` is treated as a custom "Other" entry on reopen).
 */
export function SearchableSelect({
  value,
  onValueChange,
  options,
  label,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches",
  loading,
  disabled,
  allowOther,
  className,
}: SearchableSelectProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 150);
  const [otherMode, setOtherMode] = useState(false);
  const [otherText, setOtherText] = useState("");
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(
    () => [...options].sort((a, b) => t(a.label).localeCompare(t(b.label))),
    [options, t],
  );
  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((o) => t(o.label).toLowerCase().includes(q));
  }, [sorted, debounced, t]);

  const selected = options.find((o) => o.value === value);
  const isCustom = !selected && !!value;
  const triggerLabel = selected ? t(selected.triggerLabel ?? selected.label) : isCustom ? value : "";

  function choose(v: string) {
    onValueChange(v);
    setOpen(false);
    setQuery("");
    setOtherMode(false);
  }

  function commitOther() {
    const v = otherText.trim();
    if (v) choose(v);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setQuery("");
      setHighlight(0);
      setOtherMode(isCustom);
      setOtherText(isCustom ? value : "");
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (otherMode) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt) choose(opt.value);
    }
  }

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="block text-xs font-medium tracking-[0.04em] text-ud-text-secondary mb-1.5">
          {t(label)}
        </label>
      )}
      <Popover.Root open={open} onOpenChange={onOpenChange}>
        <Popover.Trigger
          disabled={disabled}
          className={cn(
            "inline-flex items-center justify-between gap-2 h-10 px-3 rounded-xl bg-white border border-ud-border text-sm w-full text-left",
            "hover:border-ud-text-muted focus:border-ud-primary focus:outline-none focus:ring-2 focus:ring-ud-primary/15 transition-all",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        >
          <span className="flex items-center gap-2 min-w-0">
            {selected?.leading}
            <span className={cn("truncate", !triggerLabel && "text-ud-text-faint")}>
              {triggerLabel || t(placeholder)}
            </span>
          </span>
          <ChevronDown className="w-4 h-4 shrink-0 text-ud-text-muted" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className="z-50 w-[var(--radix-popover-trigger-width)] outline-none"
            onKeyDown={onKeyDown}
          >
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="bg-white rounded-xl shadow-elevated border border-ud-border overflow-hidden"
            >
              {otherMode ? (
                <div className="p-2 space-y-2">
                  <Input
                    autoFocus
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitOther();
                      }
                    }}
                    placeholder={t("Type your answer")}
                    prefixIcon={<Search className="w-4 h-4" />}
                  />
                  <div className="flex items-center justify-between gap-2">
                    {allowOther && options.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setOtherMode(false)}
                        className="text-xs text-ud-text-muted hover:text-ud-text-primary transition-colors"
                      >
                        {t("Back to list")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={commitOther}
                      disabled={!otherText.trim()}
                      className="ml-auto rounded-lg bg-ud-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-ud-primary-hover disabled:opacity-50 transition-colors"
                    >
                      {t("Use this")}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-2 border-b border-ud-border">
                    <Input
                      autoFocus
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setHighlight(0);
                      }}
                      placeholder={t(searchPlaceholder)}
                      prefixIcon={<Search className="w-4 h-4" />}
                    />
                  </div>
                  <div ref={listRef} className="max-h-60 overflow-y-auto p-1">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-sm text-ud-text-muted">
                        <Loader2 className="w-4 h-4 animate-spin" /> {t("Loading…")}
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="py-6 text-center text-sm text-ud-text-muted">{t(emptyText)}</div>
                    ) : (
                      filtered.map((o, i) => (
                        <button
                          key={o.value}
                          type="button"
                          onMouseEnter={() => setHighlight(i)}
                          onClick={() => choose(o.value)}
                          className={cn(
                            "relative flex w-full items-center gap-2 px-3 py-2 text-sm rounded-lg text-left outline-none",
                            i === highlight ? "bg-ud-surface-2" : "hover:bg-ud-surface-2",
                            o.value === value && "bg-ud-primary-50 text-ud-primary",
                          )}
                        >
                          {o.leading}
                          <span className="truncate">{t(o.label)}</span>
                          {o.value === value && <Check className="ml-auto w-3.5 h-3.5 shrink-0" />}
                        </button>
                      ))
                    )}
                    {allowOther && (
                      <button
                        type="button"
                        onClick={() => {
                          setOtherMode(true);
                          setOtherText(isCustom ? value : "");
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-sm rounded-lg text-left outline-none hover:bg-ud-surface-2",
                          isCustom && "bg-ud-primary-50 text-ud-primary",
                        )}
                      >
                        <span className="truncate">{t(OTHER_LABEL)}{isCustom ? ` — ${value}` : "…"}</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
