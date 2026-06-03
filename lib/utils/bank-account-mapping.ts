/**
 * Maps COA cash & bank account codes to BankAccount ids in the data store.
 * When a journal entry is posted against one of these codes, the corresponding
 * BankAccount.balance is adjusted live and a BankTransaction is appended.
 */
export const BANK_COA_MAP: Record<string, string> = {
  "1010": "ba_001", // CRDB Operating
  "1011": "ba_002", // NMB Payroll
  "1012": "ba_003", // Stanbic USD
  "1013": "ba_004", // NBC Collections
};

export function bankIdForAccountCode(code: string): string | undefined {
  return BANK_COA_MAP[code];
}
