"use client";
import * as RadixTabs from "@radix-ui/react-tabs";
import { motion } from "framer-motion";
import { useT } from "@/lib/hooks/useT";
import { cn } from "@/lib/utils/cn";

interface Tab {
  value: string;
  label: string;
  badge?: React.ReactNode;
}

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  tabs: Tab[];
  className?: string;
}

export function Tabs({ value, onValueChange, tabs, className }: TabsProps) {
  const tr = useT();
  return (
    <RadixTabs.Root value={value} onValueChange={onValueChange} className={className}>
      <RadixTabs.List className="flex items-center gap-1 border-b border-ud-border overflow-x-auto">
        {tabs.map((tab) => (
          <RadixTabs.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-primary focus-visible:ring-offset-2 rounded-t-lg",
              value === tab.value ? "text-ud-primary" : "text-ud-text-muted hover:text-ud-text-secondary"
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              {tr(tab.label)}
              {tab.badge}
            </span>
            {value === tab.value && (
              <motion.div
                layoutId="tabs-underline"
                className="absolute left-0 right-0 -bottom-px h-0.5 bg-ud-primary rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
    </RadixTabs.Root>
  );
}
