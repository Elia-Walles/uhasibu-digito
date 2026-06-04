// Helpers to map Prisma rows (Decimal money, Date columns) to the plain UI domain
// types in types/index.ts (number money, ISO-string dates), so Server Actions return
// values the existing client components consume unchanged.

/** Prisma Decimal | number → number. Decimal has .toNumber(); plain numbers pass through. */
export function decToNum(value: number | { toNumber(): number }): number {
  return typeof value === "number" ? value : value.toNumber();
}

/** Date → "YYYY-MM-DD" (matches the mock's issueDate/dueDate shape). */
export function dateOnly(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

/** Date → full ISO string (paidAt / sentAt / timestamps). */
export function iso(d: Date): string {
  return d.toISOString();
}
