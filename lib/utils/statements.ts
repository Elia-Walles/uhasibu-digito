// Period selector options for the financial-statement pages. The statements themselves are
// computed server-side from the GL (lib/server/actions/statements.ts); this only supplies the
// period enum + labels used by the PeriodSelector control.
export type StatementPeriod = "Q1" | "Q2" | "Q3" | "Q4" | "FY";

const CURRENT_YEAR = new Date().getFullYear();

export const PERIOD_OPTIONS: { value: StatementPeriod; label: string }[] = [
  { value: "Q1", label: `Q1 ${CURRENT_YEAR}` },
  { value: "Q2", label: `Q2 ${CURRENT_YEAR}` },
  { value: "Q3", label: `Q3 ${CURRENT_YEAR}` },
  { value: "Q4", label: `Q4 ${CURRENT_YEAR}` },
  { value: "FY", label: `Full Year ${CURRENT_YEAR}` },
];
