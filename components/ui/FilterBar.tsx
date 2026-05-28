"use client";
import { Search } from "lucide-react";
import { Input } from "./Input";
import { cn } from "@/lib/utils/cn";

interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters,
  actions,
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 mb-4",
        "md:flex-row md:items-center md:justify-between",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center flex-1 min-w-0">
        {onSearchChange && (
          <div className="sm:w-72">
            <Input
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              prefixIcon={<Search className="w-4 h-4" />}
            />
          </div>
        )}
        {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
