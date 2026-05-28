export function formatTZS(amount: number, compact = false): string {
  if (compact) {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? "-" : "";
    if (abs >= 1_000_000_000) return `${sign}TSh ${(abs / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000)     return `${sign}TSh ${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000)         return `${sign}TSh ${(abs / 1_000).toFixed(0)}K`;
    return `${sign}TSh ${abs.toLocaleString()}`;
  }
  return new Intl.NumberFormat("sw-TZ", {
    style: "currency",
    currency: "TZS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-TZ").format(Math.round(amount));
}

export function formatPct(value: number, decimals = 1): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

export function formatSignedAmount(amount: number, parens = true): string {
  if (amount < 0) {
    const abs = formatAmount(Math.abs(amount));
    return parens ? `(${abs})` : `-${abs}`;
  }
  return formatAmount(amount);
}
