interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

// Varied widths so the placeholder reads like real aligned data, not a block of equal bars.
const COL_WIDTHS = ["w-24", "w-16", "w-32", "w-20", "w-28", "w-14", "w-24"];

export function TableSkeleton({ rows = 8, columns = 5 }: TableSkeletonProps) {
  return (
    <div className="bg-white rounded-2xl border border-ud-border overflow-hidden shadow-card">
      {/* Header */}
      <div className="px-4 py-3 border-b border-ud-border bg-ud-surface-2 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className={`flex-1 flex ${i === columns - 1 ? "justify-end" : ""}`}>
            <span className="skeleton h-2.5 w-16 rounded-full" />
          </div>
        ))}
      </div>
      {/* Body */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className={`px-4 py-3.5 border-b border-ud-border last:border-b-0 flex gap-4 items-center ${r % 2 === 1 ? "bg-ud-surface-2/40" : ""}`}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <div key={c} className={`flex-1 flex ${c === columns - 1 ? "justify-end" : ""}`}>
              <span
                className={`skeleton h-3 rounded-full ${c === columns - 1 ? "w-14" : COL_WIDTHS[(r + c) % COL_WIDTHS.length]}`}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
