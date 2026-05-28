import { cn } from "@/lib/utils/cn";
import { formatTZS } from "@/lib/utils/currency";

interface CurrencyDisplayProps {
  amount: number;
  compact?: boolean | undefined;
  colored?: boolean | undefined;
  showSymbol?: boolean | undefined;
  className?: string | undefined;
}

export function CurrencyDisplay({
  amount,
  compact = false,
  colored = false,
  showSymbol = true,
  className,
}: CurrencyDisplayProps) {
  const isNeg = amount < 0;
  const display = formatTZS(Math.abs(amount), compact);
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
