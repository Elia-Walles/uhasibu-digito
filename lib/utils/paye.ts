// TRA 2024 PAYE bands (monthly TZS)
const BANDS: ReadonlyArray<{ min: number; max: number; rate: number }> = [
  { min: 0,         max: 270_000,    rate: 0.00 },
  { min: 270_001,   max: 520_000,    rate: 0.08 },
  { min: 520_001,   max: 760_000,    rate: 0.20 },
  { min: 760_001,   max: 1_000_000,  rate: 0.25 },
  { min: 1_000_001, max: Infinity,   rate: 0.30 },
];

export function calculatePAYE(monthlyGross: number): number {
  let tax = 0;
  for (const band of BANDS) {
    if (monthlyGross <= band.min - 1) break;
    const taxable = Math.min(monthlyGross, band.max) - (band.min - 1);
    if (taxable > 0) tax += taxable * band.rate;
  }
  return Math.round(tax);
}

export interface DeductionResult {
  grossPay: number;
  paye: number;
  nssf_employee: number;
  nssf_employer: number;
  sdl: number;
  wcf: number;
  heslb: number;
  netPay: number;
}

export function calculateDeductions(grossPay: number, hasHeslb = false): DeductionResult {
  const paye          = calculatePAYE(grossPay);
  const nssf_employee = Math.round(grossPay * 0.10);
  const nssf_employer = Math.round(grossPay * 0.10);
  const sdl           = Math.round(grossPay * 0.04);
  const wcf           = Math.round(grossPay * 0.005);
  const heslb         = hasHeslb ? Math.round(grossPay * 0.025) : 0;
  const netPay        = grossPay - paye - nssf_employee - heslb;
  return { grossPay, paye, nssf_employee, nssf_employer, sdl, wcf, heslb, netPay };
}
