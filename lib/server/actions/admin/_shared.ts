import { decToNum } from "@/lib/server/serialize";

/** Normalize a subscription amount to a monthly figure for MRR. */
export function monthlyAmount(amount: number | { toNumber(): number }, interval: string): number {
  const value = decToNum(amount);
  return interval === "year" ? value / 12 : value;
}
