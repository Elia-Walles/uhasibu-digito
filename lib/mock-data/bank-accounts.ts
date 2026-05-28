import type { BankAccount, BankTransaction } from "@/types";
import { rngFromSeed, randomInt, randomTZS, isoDate, range, pick } from "./generators";

const rnd = rngFromSeed(606060);

function generateTransactions(opening: number, count: number, currency: "TZS" | "USD"): BankTransaction[] {
  let balance = opening;
  const descriptions = currency === "TZS"
    ? ["Customer payment — Kariakoo","Supplier payment — Tanga Hardware","Salary disbursement","Rent — Plot 47","TANESCO utility","TRA VAT remittance","Inventory restock","NSSF contribution","Loan repayment","Sales receipt","Bank charges"]
    : ["FX deposit","International wire — supplier","FX gain","Bank charges USD","Outgoing wire","Customer USD payment"];

  const tx: BankTransaction[] = range(count, (i) => {
    const d = new Date(2024, 9, randomInt(1, 28, rnd));
    const isDebit = randomInt(0, 1, rnd) === 1;
    const amount  = currency === "TZS"
      ? randomTZS(50_000, 18_000_000, rnd)
      : randomInt(50, 3_000, rnd) * 100;
    if (isDebit) balance -= amount;
    else         balance += amount;
    return {
      id: `tx_${i + 1}`,
      date: isoDate(d),
      description: pick(descriptions, rnd),
      debit:  isDebit ? amount : 0,
      credit: isDebit ? 0      : amount,
      balance,
      reference: `REF-${String(i + 1).padStart(6, "0")}`,
      matched: randomInt(0, 100, rnd) > 25,
    };
  });
  return tx.sort((a, b) => b.date.localeCompare(a.date));
}

export const BANK_ACCOUNTS: BankAccount[] = [
  {
    id: "ba_001",
    bankName: "CRDB Bank",
    accountName: "Kilimanjaro Trading — Operating",
    accountNumber: "0150-1234-5678-9",
    currency: "TZS",
    balance: 198_430_000,
    transactions: generateTransactions(175_400_000, 30, "TZS"),
  },
  {
    id: "ba_002",
    bankName: "NMB Bank",
    accountName: "Kilimanjaro Trading — Payroll",
    accountNumber: "2031-9876-5432-1",
    currency: "TZS",
    balance: 89_200_000,
    transactions: generateTransactions(87_500_000, 30, "TZS"),
  },
  {
    id: "ba_003",
    bankName: "Stanbic Bank",
    accountName: "Kilimanjaro Trading — USD",
    accountNumber: "9100-5544-3322-1",
    currency: "USD",
    balance: 45_600,
    balanceUSD: 45_600,
    transactions: generateTransactions(43_200, 30, "USD"),
  },
];
