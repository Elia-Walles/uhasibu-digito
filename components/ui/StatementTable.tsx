import { CurrencyDisplay } from "./CurrencyDisplay";
import { cn } from "@/lib/utils/cn";
import type { FinancialStatementLine } from "@/types";

interface StatementTableProps {
  lines: FinancialStatementLine[];
  currentLabel?: string;
  priorLabel?: string;
}

export function StatementTable({
  lines,
  currentLabel = "Current period",
  priorLabel = "Prior period",
}: StatementTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-ud-border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-ud-surface-2">
          <tr>
            <th className="text-left px-5 py-3 text-xs uppercase tracking-[0.06em] font-semibold text-ud-text-secondary" scope="col">Line item</th>
            <th className="text-right px-5 py-3 text-xs uppercase tracking-[0.06em] font-semibold text-ud-text-secondary" scope="col">{currentLabel}</th>
            <th className="text-right px-5 py-3 text-xs uppercase tracking-[0.06em] font-semibold text-ud-text-secondary" scope="col">{priorLabel}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => {
            const indent = (line.indent ?? 0) * 16;
            const isHeader = line.isHeader;
            const isTotal  = line.isTotal;
            return (
              <tr
                key={i}
                className={cn(
                  "border-t border-ud-border",
                  isHeader && "bg-ud-primary-50/60",
                  isTotal  && "bg-ud-surface-2 font-bold"
                )}
              >
                <td
                  className={cn(
                    "px-5 py-2.5",
                    isHeader && "font-bold uppercase tracking-[0.04em] text-ud-primary text-xs"
                  )}
                  style={{ paddingLeft: 20 + indent }}
                >
                  {line.label}
                </td>
                <td className="px-5 py-2.5 text-right">
                  {line.current === 0 && (isHeader || isTotal) ? "" : (
                    <CurrencyDisplay
                      amount={line.current}
                      showSymbol={false}
                      colored={isTotal}
                      className={cn(isTotal && "text-base", isHeader && "font-semibold")}
                    />
                  )}
                </td>
                <td className="px-5 py-2.5 text-right text-ud-text-muted">
                  {line.prior === 0 && (isHeader || isTotal) ? "" : (
                    <CurrencyDisplay amount={line.prior} showSymbol={false} className={cn(isTotal && "text-base font-semibold")} />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
