"use client";
import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { useT } from "@/lib/hooks/useT";
import { cn } from "@/lib/utils/cn";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  label,
  className,
  disabled,
}: SelectProps) {
  const t = useT();
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="block text-xs font-medium tracking-[0.04em] text-ud-text-secondary mb-1.5">
          {t(label)}
        </label>
      )}
      <RadixSelect.Root
        {...(value !== undefined && { value })}
        {...(onValueChange && { onValueChange })}
        {...(disabled !== undefined && { disabled })}
      >
        <RadixSelect.Trigger
          className={cn(
            "inline-flex items-center justify-between gap-2 h-10 px-3 rounded-xl bg-white border border-ud-border text-sm w-full",
            "hover:border-ud-text-muted focus:border-ud-primary focus:outline-none focus:ring-2 focus:ring-ud-primary/15 transition-all",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <RadixSelect.Value placeholder={<span className="text-ud-text-faint">{t(placeholder)}</span>} />
          <RadixSelect.Icon>
            <ChevronDown className="w-4 h-4 text-ud-text-muted" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={6}
            className="z-50 min-w-[var(--radix-select-trigger-width)] bg-white rounded-xl shadow-elevated border border-ud-border overflow-hidden"
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((o) => (
                <RadixSelect.Item
                  key={o.value}
                  value={o.value}
                  className="relative flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-ud-surface-2 data-[state=checked]:bg-ud-primary-50 data-[state=checked]:text-ud-primary outline-none"
                >
                  <RadixSelect.ItemText>{t(o.label)}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="ml-auto">
                    <Check className="w-3.5 h-3.5" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  );
}
