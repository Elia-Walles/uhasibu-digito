import type { COAAccount } from "@/types";

/**
 * Standard Tanzanian Chart of Accounts template hierarchical, all balances zeroed.
 * Seeded into every new tenant so the GL, trial balance, and financial statements work out
 * of the box. This is genuine reference configuration.
 */
export const STANDARD_COA: COAAccount[] = [
  { code: "1000", name: "Assets",                      type: "Asset",       parentCode: null,   openingBalance: 0, movement: 0, closingBalance: 0, level: 0 },
  { code: "1100", name: "Cash & Bank",                 type: "Asset",       parentCode: "1000", openingBalance: 0, movement: 0, closingBalance: 0, level: 1 },
  { code: "1110", name: "CRDB TZS Account",            type: "Asset",       parentCode: "1100", openingBalance: 0, movement: 0, closingBalance: 0, level: 2 },
  { code: "1120", name: "NMB TZS Account",             type: "Asset",       parentCode: "1100", openingBalance: 0, movement: 0, closingBalance: 0, level: 2 },
  { code: "1130", name: "Stanbic USD Account",         type: "Asset",       parentCode: "1100", openingBalance: 0, movement: 0, closingBalance: 0, level: 2 },
  { code: "1140", name: "Cash on Hand",                type: "Asset",       parentCode: "1100", openingBalance: 0, movement: 0, closingBalance: 0, level: 2 },
  { code: "1150", name: "Mobile Money (M-Pesa)",       type: "Asset",       parentCode: "1100", openingBalance: 0, movement: 0, closingBalance: 0, level: 2 },
  { code: "1200", name: "Trade Receivables",           type: "Asset",       parentCode: "1000", openingBalance: 0, movement: 0, closingBalance: 0, level: 1 },
  { code: "1250", name: "Input VAT Recoverable",       type: "Asset",       parentCode: "1000", openingBalance: 0, movement: 0, closingBalance: 0, level: 1 },
  { code: "1300", name: "Inventory",                   type: "Asset",       parentCode: "1000", openingBalance: 0, movement: 0, closingBalance: 0, level: 1 },
  { code: "1500", name: "Property, Plant & Equipment", type: "Asset",       parentCode: "1000", openingBalance: 0, movement: 0, closingBalance: 0, level: 1 },
  { code: "1590", name: "Accumulated Depreciation",    type: "Asset",       parentCode: "1000", openingBalance: 0, movement: 0, closingBalance: 0, level: 1 },
  { code: "1600", name: "Intangible Assets",           type: "Asset",       parentCode: "1000", openingBalance: 0, movement: 0, closingBalance: 0, level: 1 },
  { code: "2000", name: "Liabilities",                 type: "Liability",   parentCode: null,   openingBalance: 0, movement: 0, closingBalance: 0, level: 0 },
  { code: "2100", name: "Trade Payables",              type: "Liability",   parentCode: "2000", openingBalance: 0, movement: 0, closingBalance: 0, level: 1 },
  { code: "2150", name: "Statutory Payables",          type: "Liability",   parentCode: "2000", openingBalance: 0, movement: 0, closingBalance: 0, level: 1 },
  { code: "2200", name: "Tax Payable",                 type: "Liability",   parentCode: "2000", openingBalance: 0, movement: 0, closingBalance: 0, level: 1 },
  { code: "2300", name: "Bank Loans",                  type: "Liability",   parentCode: "2000", openingBalance: 0, movement: 0, closingBalance: 0, level: 1 },
  { code: "3000", name: "Equity",                      type: "Equity",      parentCode: null,   openingBalance: 0, movement: 0, closingBalance: 0, level: 0 },
  { code: "3100", name: "Share Capital",               type: "Equity",      parentCode: "3000", openingBalance: 0, movement: 0, closingBalance: 0, level: 1 },
  { code: "3200", name: "Retained Earnings",           type: "Equity",      parentCode: "3000", openingBalance: 0, movement: 0, closingBalance: 0, level: 1 },
  { code: "3900", name: "Opening Balance Equity",      type: "Equity",      parentCode: "3000", openingBalance: 0, movement: 0, closingBalance: 0, level: 1 },
  { code: "4000", name: "Income",                      type: "Income",      parentCode: null,   openingBalance: 0, movement: 0, closingBalance: 0, level: 0 },
  { code: "4100", name: "Sales Revenue",               type: "Income",      parentCode: "4000", openingBalance: 0, movement: 0, closingBalance: 0, level: 1 },
  { code: "4200", name: "Gain on Asset Disposal",      type: "Income",      parentCode: "4000", openingBalance: 0, movement: 0, closingBalance: 0, level: 1 },
  { code: "4300", name: "Foreign Exchange Gain",       type: "Income",      parentCode: "4000", openingBalance: 0, movement: 0, closingBalance: 0, level: 1 },
  { code: "5000", name: "Cost of Sales",               type: "CostOfSales", parentCode: null,   openingBalance: 0, movement: 0, closingBalance: 0, level: 0 },
  { code: "6000", name: "Operating Expenses",          type: "Expense",     parentCode: null,   openingBalance: 0, movement: 0, closingBalance: 0, level: 0 },
  { code: "6100", name: "Staff Costs",                 type: "Expense",     parentCode: "6000", openingBalance: 0, movement: 0, closingBalance: 0, level: 1 },
  { code: "6200", name: "Rent & Utilities",            type: "Expense",     parentCode: "6000", openingBalance: 0, movement: 0, closingBalance: 0, level: 1 },
  { code: "6300", name: "Depreciation",                type: "Expense",     parentCode: "6000", openingBalance: 0, movement: 0, closingBalance: 0, level: 1 },
  { code: "6400", name: "Other Operating Costs",       type: "Expense",     parentCode: "6000", openingBalance: 0, movement: 0, closingBalance: 0, level: 1 },
  { code: "6500", name: "Loss on Asset Disposal",      type: "Expense",     parentCode: "6000", openingBalance: 0, movement: 0, closingBalance: 0, level: 1 },
  { code: "6600", name: "Foreign Exchange Loss",       type: "Expense",     parentCode: "6000", openingBalance: 0, movement: 0, closingBalance: 0, level: 1 },
  { code: "7000", name: "Finance Costs",               type: "Expense",     parentCode: null,   openingBalance: 0, movement: 0, closingBalance: 0, level: 0 },
  { code: "7100", name: "Interest Expense",            type: "Expense",     parentCode: "7000", openingBalance: 0, movement: 0, closingBalance: 0, level: 1 },
];

/** Default departments seeded into a new tenant. */
export const DEFAULT_DEPARTMENTS = [
  "Administration",
  "Finance",
  "Sales",
  "Operations",
  "Procurement",
  "Human Resources",
];
