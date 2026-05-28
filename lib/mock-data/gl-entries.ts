import type { GLEntry, COAAccount, GLStatus } from "@/types";
import { rngFromSeed, pick, range, randomInt, randomTZS, isoDate } from "./generators";

const rnd = rngFromSeed(91011);

const ACCOUNTS = [
  { code: "1100", name: "Cash & Bank" },
  { code: "1200", name: "Trade Receivables" },
  { code: "1300", name: "Inventory" },
  { code: "1500", name: "Property, Plant & Equipment" },
  { code: "2100", name: "Trade Payables" },
  { code: "2200", name: "Tax Payable" },
  { code: "2300", name: "Bank Loans" },
  { code: "3000", name: "Share Capital" },
  { code: "3100", name: "Retained Earnings" },
  { code: "4000", name: "Sales Revenue" },
  { code: "5000", name: "Cost of Sales" },
  { code: "6100", name: "Staff Costs" },
  { code: "6200", name: "Rent & Utilities" },
  { code: "6300", name: "Depreciation" },
  { code: "6400", name: "Other Operating Expenses" },
  { code: "7100", name: "Interest Expense" },
];

const COST_CENTRES = ["DSM-Main","DSM-Annex","Mwanza","Zanzibar","Arusha","HQ"];
const POSTERS = ["Amina Hassan","Samuel Kimani","Grace Mbeki","Lilian Ngowi"];
const NARRATIONS = [
  "Customer payment received",
  "Supplier payment",
  "Salary payment monthly",
  "Rent — Plot 47 Upanga",
  "Utilities — TANESCO",
  "VAT remittance to TRA",
  "Inventory restock",
  "Loan repayment — CRDB",
  "Depreciation — vehicles",
  "Sales — Kariakoo Wholesale",
];

export const GL_ENTRIES: GLEntry[] = range(220, (i) => {
  const acct = ACCOUNTS[randomInt(0, ACCOUNTS.length - 1, rnd)]!;
  const isDebit = randomInt(0, 1, rnd) === 1;
  const amount = randomTZS(50_000, 25_000_000, rnd);
  const d = new Date(2024, randomInt(0, 9, rnd), randomInt(1, 28, rnd));
  return {
    id: `gl_${String(i + 1).padStart(4, "0")}`,
    date: isoDate(d),
    reference: `JV-2024-${String(i + 1).padStart(5, "0")}`,
    narration: pick(NARRATIONS, rnd),
    account: acct.name,
    accountCode: acct.code,
    costCentre: pick(COST_CENTRES, rnd),
    debit: isDebit ? amount : 0,
    credit: isDebit ? 0 : amount,
    balance: amount * (isDebit ? 1 : -1),
    postedBy: pick(POSTERS, rnd),
    postedAt: d.toISOString(),
    status: "Posted" as GLStatus,
  };
}).sort((a, b) => b.date.localeCompare(a.date));

// Chart of Accounts hierarchical
export const COA: COAAccount[] = [
  { code: "1000", name: "Assets",                     type: "Asset",     parentCode: null,   openingBalance: 0, movement: 0, closingBalance: 867_750_000, level: 0 },
  { code: "1100", name: "Cash & Bank",                type: "Asset",     parentCode: "1000", openingBalance: 287_900_000, movement: 24_900_000, closingBalance: 312_800_000, level: 1 },
  { code: "1110", name: "CRDB TZS Account",           type: "Asset",     parentCode: "1100", openingBalance: 175_400_000, movement: 23_030_000, closingBalance: 198_430_000, level: 2 },
  { code: "1120", name: "NMB TZS Account",            type: "Asset",     parentCode: "1100", openingBalance: 87_500_000,  movement: 1_700_000,  closingBalance: 89_200_000,  level: 2 },
  { code: "1130", name: "Stanbic USD Account",        type: "Asset",     parentCode: "1100", openingBalance: 25_000_000,  movement: 170_000,    closingBalance: 25_170_000,  level: 2 },
  { code: "1200", name: "Trade Receivables",          type: "Asset",     parentCode: "1000", openingBalance: 72_300_000,  movement: 17_150_000, closingBalance: 89_450_000,  level: 1 },
  { code: "1300", name: "Inventory",                  type: "Asset",     parentCode: "1000", openingBalance: 109_400_000, movement: 16_380_000, closingBalance: 125_780_000, level: 1 },
  { code: "1500", name: "Property, Plant & Equipment", type: "Asset",    parentCode: "1000", openingBalance: 268_400_000, movement: 44_100_000, closingBalance: 312_500_000, level: 1 },
  { code: "1600", name: "Intangible Assets",          type: "Asset",     parentCode: "1000", openingBalance: 15_200_000,  movement: 3_700_000,  closingBalance: 18_900_000,  level: 1 },
  { code: "2000", name: "Liabilities",                type: "Liability", parentCode: null,   openingBalance: 0, movement: 0, closingBalance: 280_800_000, level: 0 },
  { code: "2100", name: "Trade Payables",             type: "Liability", parentCode: "2000", openingBalance: 73_400_000,  movement: 12_900_000, closingBalance: 86_300_000,  level: 1 },
  { code: "2200", name: "Tax Payable",                type: "Liability", parentCode: "2000", openingBalance: 29_640_000,  movement: 4_860_000,  closingBalance: 34_500_000,  level: 1 },
  { code: "2300", name: "Bank Loans",                 type: "Liability", parentCode: "2000", openingBalance: 138_900_000, movement: 3_100_000,  closingBalance: 142_000_000, level: 1 },
  { code: "3000", name: "Equity",                     type: "Equity",    parentCode: null,   openingBalance: 0, movement: 0, closingBalance: 586_950_000, level: 0 },
  { code: "3100", name: "Share Capital",              type: "Equity",    parentCode: "3000", openingBalance: 200_000_000, movement: 0,           closingBalance: 200_000_000, level: 1 },
  { code: "3200", name: "Retained Earnings",          type: "Equity",    parentCode: "3000", openingBalance: 306_450_000, movement: 80_500_000, closingBalance: 386_950_000, level: 1 },
  { code: "4000", name: "Income",                     type: "Income",    parentCode: null,   openingBalance: 0, movement: 847_230_000, closingBalance: 847_230_000, level: 0 },
  { code: "4100", name: "Sales Revenue",              type: "Income",    parentCode: "4000", openingBalance: 0, movement: 847_230_000, closingBalance: 847_230_000, level: 1 },
  { code: "5000", name: "Cost of Sales",              type: "CostOfSales", parentCode: null, openingBalance: 0, movement: 418_820_000, closingBalance: 418_820_000, level: 0 },
  { code: "6000", name: "Operating Expenses",         type: "Expense",   parentCode: null,   openingBalance: 0, movement: 303_850_000, closingBalance: 303_850_000, level: 0 },
  { code: "6100", name: "Staff Costs",                type: "Expense",   parentCode: "6000", openingBalance: 0, movement: 187_200_000, closingBalance: 187_200_000, level: 1 },
  { code: "6200", name: "Rent & Utilities",           type: "Expense",   parentCode: "6000", openingBalance: 0, movement: 34_800_000,  closingBalance: 34_800_000,  level: 1 },
  { code: "6300", name: "Depreciation",               type: "Expense",   parentCode: "6000", openingBalance: 0, movement: 18_400_000,  closingBalance: 18_400_000,  level: 1 },
  { code: "6400", name: "Other Operating Costs",      type: "Expense",   parentCode: "6000", openingBalance: 0, movement: 63_450_000,  closingBalance: 63_450_000,  level: 1 },
  { code: "7000", name: "Finance Costs",              type: "Expense",   parentCode: null,   openingBalance: 0, movement: 12_800_000,  closingBalance: 12_800_000,  level: 0 },
  { code: "7100", name: "Interest Expense",           type: "Expense",   parentCode: "7000", openingBalance: 0, movement: 12_800_000,  closingBalance: 12_800_000,  level: 1 },
];
