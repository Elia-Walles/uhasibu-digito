// Fiscal-year date math. Pure + framework-agnostic so it's unit-testable. The company's fiscal
// year start month (1=Jan … 12=Dec) lives on CompanyProfile.fiscalYearStartMonth; callers read it
// and pass it in. A Jan start behaves exactly like the calendar year.

export interface FiscalYearBounds {
  fyStart: Date;
  fyEnd: Date;
  label: string;
}

/** The fiscal year that CONTAINS `ref`, given the start month (1–12). */
export function fiscalYearBounds(ref: Date, startMonth: number): FiscalYearBounds {
  const startM0 = Math.min(11, Math.max(0, startMonth - 1)); // 0-based, clamped
  const m = ref.getMonth();
  const startYear = m >= startM0 ? ref.getFullYear() : ref.getFullYear() - 1;
  const fyStart = new Date(startYear, startM0, 1, 0, 0, 0, 0);
  // Day before the next fiscal year's start (JS Date handles month overflow).
  const fyEnd = new Date(startYear + 1, startM0, 0, 23, 59, 59, 999);
  const endYear = fyEnd.getFullYear();
  const label = startM0 === 0 ? `FY ${startYear}` : `FY ${startYear}/${String(endYear).slice(-2)}`;
  return { fyStart, fyEnd, label };
}

/** The fiscal year immediately before the one containing `ref`. */
export function priorFiscalYearBounds(ref: Date, startMonth: number): FiscalYearBounds {
  const { fyStart } = fiscalYearBounds(ref, startMonth);
  return fiscalYearBounds(new Date(fyStart.getTime() - 1), startMonth);
}

/** Bounds of fiscal quarter q (1–4) within a fiscal year that starts at `fyStart`. */
export function fiscalQuarterBounds(fyStart: Date, q: 1 | 2 | 3 | 4): { start: Date; end: Date } {
  const offset = (q - 1) * 3;
  const start = new Date(fyStart.getFullYear(), fyStart.getMonth() + offset, 1, 0, 0, 0, 0);
  const end = new Date(fyStart.getFullYear(), fyStart.getMonth() + offset + 3, 0, 23, 59, 59, 999);
  return { start, end };
}
