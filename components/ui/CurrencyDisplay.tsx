import { cn } from "@/lib/utils/cn";
import { formatTZS } from "@/lib/utils/currency";

interface CurrencyDisplayProps {
  amount: number;
  /** @deprecated Money is always shown in full — abbreviations (K/M/B) are no longer used on cards. */
  compact?: boolean | undefined;
  colored?: boolean | undefined;
  showSymbol?: boolean | undefined;
  className?: string | undefined;
}

export function CurrencyDisplay({
  amount,
  colored = false,
  showSymbol = true,
  className,
}: CurrencyDisplayProps) {
  const isNeg = amount < 0;
  // Always full grouped numbers (e.g. 90,000,000) — never abbreviated on financial cards/cells.
  const display = formatTZS(Math.abs(amount));
  // Strip currency symbol if not wanted
  const value = showSymbol ? display : display.replace(/[A-Za-z\s]+/g, "").trim();

  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        colored && isNeg && "text-ud-danger",
        colored && !isNeg && amount > 0 && "text-ud-success",
        className
      )}
    >
      {isNeg ? `(${value})` : value}
    </span>
  );
}
