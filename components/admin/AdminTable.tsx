"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export interface AdminColumn<T> {
  key: string;
  label: string;
  align?: "left" | "right";
  render?: (row: T) => React.ReactNode;
}

interface AdminTableProps<T> {
  data: T[];
  columns: AdminColumn<T>[];
  rowKey: (row: T, i: number) => string;
  onRowClick?: (row: T) => void;
  emptyLabel?: string;
  caption?: string;
}

export function AdminTable<T>({
  data,
  columns,
  rowKey,
  onRowClick,
  emptyLabel = "No records yet.",
  caption = "Admin data table",
}: AdminTableProps<T>) {
  if (data.length === 0) {
    return <div className="py-14 text-center text-sm text-ud-text-muted">{emptyLabel}</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-ud-border">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  "py-2.5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ud-text-muted",
                  c.align === "right" ? "text-right" : "text-left",
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <motion.tr
              key={rowKey(row, i)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * 0.015, 0.3) }}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "border-b border-ud-border/70 text-ud-text-secondary",
                onRowClick && "cursor-pointer hover:bg-ud-surface-2 transition-colors",
              )}
            >
              {columns.map((c) => {
                const raw = (row as Record<string, unknown>)[c.key];
                return (
                  <td
                    key={c.key}
                    className={cn(
                      "py-3 px-3",
                      c.align === "right" && "text-right font-mono tabular-nums",
                    )}
                  >
                    {c.render ? c.render(row) : raw === null || raw === undefined ? "" : String(raw)}
                  </td>
                );
              })}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
