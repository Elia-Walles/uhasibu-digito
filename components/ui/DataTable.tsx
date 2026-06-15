"use client";
import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";
import { Inbox } from "lucide-react";
import { useT } from "@/lib/hooks/useT";
import { cn } from "@/lib/utils/cn";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: "left" | "right" | "center";
  className?: string;
  render?: (row: T, idx: number) => React.ReactNode;
  accessor?: (row: T) => string | number;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  loading?: boolean;
  caption?: string;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  initialSortKey?: string;
  initialSortDir?: "asc" | "desc";
  rowKey?: (row: T, idx: number) => string;
}

export function DataTable<T>({
  data,
  columns,
  pageSize = 10,
  loading,
  caption = "Data table",
  onRowClick,
  emptyTitle = "Nothing here yet",
  emptyDescription = "Records will appear here once they exist.",
  className,
  initialSortKey,
  initialSortDir = "desc",
  rowKey,
}: DataTableProps<T>) {
  const t = useT();
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(
    initialSortKey ? { key: initialSortKey, dir: initialSortDir } : null
  );
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return data;
    const acc = col.accessor;
    const copy = [...data];
    copy.sort((a, b) => {
      const va = acc ? acc(a) : (a as Record<string, unknown>)[sort.key];
      const vb = acc ? acc(b) : (b as Record<string, unknown>)[sort.key];
      if (typeof va === "number" && typeof vb === "number") {
        return sort.dir === "asc" ? va - vb : vb - va;
      }
      return sort.dir === "asc"
        ? String(va ?? "").localeCompare(String(vb ?? ""))
        : String(vb ?? "").localeCompare(String(va ?? ""));
    });
    return copy;
  }, [data, sort, columns]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = page * pageSize;
  const slice = sorted.slice(start, start + pageSize);

  if (loading) {
    return (
      <div className={cn("bg-white rounded-2xl border border-ud-border overflow-hidden shadow-card", className)}>
        <GhostTable columns={columns} shimmer />
      </div>
    );
  }

  // Empty: render a ghost of the loaded layout (header + column-aligned placeholder rows)
  // so the user can see how data will line up, with a floating hint that it is empty.
  if (total === 0) {
    return (
      <div className={cn("relative bg-white rounded-2xl border border-ud-border overflow-hidden shadow-card", className)}>
        <GhostTable columns={columns} />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/25 via-white/55 to-white/80 px-4">
          <div className="flex items-center gap-3 rounded-2xl border border-ud-border bg-white/90 backdrop-blur px-4 py-3 shadow-card max-w-[90%]">
            <div className="w-9 h-9 rounded-xl bg-ud-primary-50 flex items-center justify-center flex-shrink-0">
              <Inbox className="w-5 h-5 text-ud-primary opacity-80" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ud-text-primary truncate">{t(emptyTitle)}</div>
              <div className="text-xs text-ud-text-muted">{t(emptyDescription)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-2xl border border-ud-border overflow-hidden shadow-card", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">{t(caption)}</caption>
          <thead>
            <tr className="bg-ud-surface-2 border-b border-ud-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    "px-4 py-3 text-xs font-medium tracking-[0.06em] uppercase text-ud-text-secondary whitespace-nowrap",
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                    col.className
                  )}
                >
                  {col.sortable ? (
                    <button
                      onClick={() =>
                        setSort((prev) =>
                          prev?.key === col.key
                            ? { key: col.key, dir: prev.dir === "asc" ? "desc" : "asc" }
                            : { key: col.key, dir: "desc" }
                        )
                      }
                      className="inline-flex items-center gap-1 hover:text-ud-primary focus-visible:outline-none focus-visible:text-ud-primary"
                    >
                      {t(col.label)}
                      {sort?.key === col.key ? (
                        sort.dir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronsUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </button>
                  ) : (
                    t(col.label)
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((row, i) => (
              <tr
                key={rowKey ? rowKey(row, start + i) : start + i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-ud-border last:border-b-0 transition-colors duration-150",
                  i % 2 === 1 && "bg-ud-surface-2/50",
                  onRowClick && "hover:bg-ud-primary-50 cursor-pointer"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3",
                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                      col.className
                    )}
                  >
                    {col.render
                      ? col.render(row, start + i)
                      : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-3 border-t border-ud-border text-xs text-ud-text-muted bg-ud-surface-2/40">
        <div className="truncate">
          {t("Showing")} <span className="font-medium text-ud-text-primary">{start + 1}</span>–
          <span className="font-medium text-ud-text-primary">{Math.min(start + pageSize, total)}</span> {t("of")}{" "}
          <span className="font-medium text-ud-text-primary">{total}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            icon={<ChevronLeft className="w-3 h-3" />}
            className="min-h-[44px] sm:min-h-0"
            aria-label="Previous page"
          >
            <span className="hidden sm:inline">{t("Previous")}</span>
          </Button>
          <span className="font-medium text-ud-text-primary whitespace-nowrap">
            {page + 1} / {pageCount}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="min-h-[44px] sm:min-h-0"
            aria-label="Next page"
          >
            <span className="hidden sm:inline">{t("Next")}</span>
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Varied placeholder-bar widths so ghost rows read as real data, not a single block.
const GHOST_WIDTHS = ["w-24", "w-16", "w-32", "w-20", "w-28", "w-14"];

/**
 * Renders the table header plus column-aligned placeholder rows. Used for the loading
 * state (shimmer) and the empty state (static ghost behind a "no data" hint) so both
 * mirror the real loaded layout and show how data will align.
 */
function GhostTable({
  columns,
  rows = 5,
  shimmer = false,
}: {
  columns: { key: string; label: string; align?: "left" | "right" | "center"; width?: string; className?: string }[];
  rows?: number;
  shimmer?: boolean;
}) {
  const t = useT();
  return (
    <div className="overflow-x-auto" aria-hidden="true">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-ud-surface-2 border-b border-ud-border">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={col.width ? { width: col.width } : undefined}
                className={cn(
                  "px-4 py-3 text-xs font-medium tracking-[0.06em] uppercase text-ud-text-secondary whitespace-nowrap",
                  col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                  col.className
                )}
              >
                {t(col.label)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className={cn("border-b border-ud-border last:border-b-0", r % 2 === 1 && "bg-ud-surface-2/40")}>
              {columns.map((col, c) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-4 py-3.5",
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-3 rounded-full align-middle",
                      shimmer ? "skeleton" : "bg-ud-border/70",
                      col.align === "right" ? "w-14" : GHOST_WIDTHS[(r + c) % GHOST_WIDTHS.length]
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
