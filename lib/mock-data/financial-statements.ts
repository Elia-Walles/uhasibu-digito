import type { FinancialStatementLine } from "@/types";

export const INCOME_STATEMENT: FinancialStatementLine[] = [
  { label: "Revenue",                            current: 847_230_000, prior: 739_600_000, isHeader: true },
  { label: "Sales",                              current: 847_230_000, prior: 739_600_000, indent: 1 },
  { label: "Cost of Sales",                      current: 418_820_000, prior: 367_400_000, isNegative: true, indent: 0, isHeader: true },
  { label: "Opening Inventory",                  current: 112_400_000, prior: 98_300_000,  indent: 1 },
  { label: "Purchases",                          current: 432_200_000, prior: 378_500_000, indent: 1 },
  { label: "Closing Inventory",                  current: -125_780_000, prior: -109_400_000, indent: 1, isNegative: true },
  { label: "Gross Profit",                       current: 428_410_000, prior: 372_200_000, isTotal: true },
  { label: "Operating Expenses",                 current: 303_850_000, prior: 264_900_000, isHeader: true },
  { label: "Staff Costs",                        current: 187_200_000, prior: 162_800_000, indent: 1 },
  { label: "Rent & Utilities",                   current: 34_800_000,  prior: 30_200_000,  indent: 1 },
  { label: "Depreciation",                       current: 18_400_000,  prior: 15_600_000,  indent: 1 },
  { label: "Other Operating Costs",              current: 63_450_000,  prior: 56_300_000,  indent: 1 },
  { label: "Operating Profit",                   current: 124_560_000, prior: 107_300_000, isTotal: true },
  { label: "Interest Income",                    current: 3_240_000,   prior: 2_900_000 },
  { label: "Interest Expense",                   current: -12_800_000, prior: -11_400_000, isNegative: true },
  { label: "Net Profit Before Tax",              current: 115_000_000, prior: 98_800_000,  isTotal: true },
  { label: "Income Tax (30%)",                   current: -34_500_000, prior: -29_640_000, isNegative: true },
  { label: "Net Profit After Tax",               current: 80_500_000,  prior: 69_160_000,  isTotal: true },
];

export const BALANCE_SHEET: FinancialStatementLine[] = [
  { label: "ASSETS", current: 0, prior: 0, isHeader: true },
  { label: "Non-Current Assets",         current: 0, prior: 0, isHeader: true, indent: 1 },
  { label: "Property, Plant & Equipment", current: 312_500_000, prior: 268_400_000, indent: 2 },
  { label: "Intangible Assets",           current: 18_900_000,  prior: 15_200_000,  indent: 2 },
  { label: "Total Non-Current Assets",    current: 331_400_000, prior: 283_600_000, isTotal: true, indent: 1 },
  { label: "Current Assets",              current: 0, prior: 0, isHeader: true, indent: 1 },
  { label: "Inventory",                   current: 125_780_000, prior: 109_400_000, indent: 2 },
  { label: "Trade Receivables",           current: 89_450_000,  prior: 72_300_000,  indent: 2 },
  { label: "Cash & Bank",                 current: 312_800_000, prior: 287_900_000, indent: 2 },
  { label: "Other Current Assets",        current: 8_320_000,   prior: 6_100_000,   indent: 2 },
  { label: "Total Current Assets",        current: 536_350_000, prior: 475_700_000, isTotal: true, indent: 1 },
  { label: "TOTAL ASSETS",                current: 867_750_000, prior: 759_300_000, isTotal: true },
  { label: "EQUITY & LIABILITIES",        current: 0, prior: 0, isHeader: true },
  { label: "Equity",                      current: 0, prior: 0, isHeader: true, indent: 1 },
  { label: "Share Capital",               current: 200_000_000, prior: 200_000_000, indent: 2 },
  { label: "Retained Earnings",           current: 386_950_000, prior: 306_450_000, indent: 2 },
  { label: "Total Equity",                current: 586_950_000, prior: 506_450_000, isTotal: true, indent: 1 },
  { label: "Non-Current Liabilities",     current: 0, prior: 0, isHeader: true, indent: 1 },
  { label: "Bank Loans",                  current: 142_000_000, prior: 138_900_000, indent: 2 },
  { label: "Total Non-Current Liabilities", current: 142_000_000, prior: 138_900_000, isTotal: true, indent: 1 },
  { label: "Current Liabilities",         current: 0, prior: 0, isHeader: true, indent: 1 },
  { label: "Trade Payables",              current: 86_300_000,  prior: 73_400_000,  indent: 2 },
  { label: "Tax Payable",                 current: 34_500_000,  prior: 29_640_000,  indent: 2 },
  { label: "Other Current Liabilities",   current: 18_000_000,  prior: 10_910_000,  indent: 2 },
  { label: "Total Current Liabilities",   current: 138_800_000, prior: 113_950_000, isTotal: true, indent: 1 },
  { label: "TOTAL EQUITY & LIABILITIES",  current: 867_750_000, prior: 759_300_000, isTotal: true },
];

export const CASH_FLOW: FinancialStatementLine[] = [
  { label: "Cash Flow from Operating Activities", current: 0, prior: 0, isHeader: true },
  { label: "Net Profit Before Tax",               current: 115_000_000, prior: 98_800_000,  indent: 1 },
  { label: "Add: Depreciation",                   current: 18_400_000,  prior: 15_600_000,  indent: 1 },
  { label: "Working Capital Changes",             current: -22_400_000, prior: -18_200_000, indent: 1, isNegative: true },
  { label: "Income Tax Paid",                     current: -29_640_000, prior: -24_300_000, indent: 1, isNegative: true },
  { label: "Net Cash from Operations",            current: 81_360_000,  prior: 71_900_000,  isTotal: true },
  { label: "Cash Flow from Investing Activities", current: 0, prior: 0, isHeader: true },
  { label: "Purchase of PPE",                     current: -62_500_000, prior: -48_400_000, indent: 1, isNegative: true },
  { label: "Net Cash from Investing",             current: -62_500_000, prior: -48_400_000, isTotal: true },
  { label: "Cash Flow from Financing Activities", current: 0, prior: 0, isHeader: true },
  { label: "Loan Drawdown",                       current: 30_000_000,  prior: 18_000_000,  indent: 1 },
  { label: "Loan Repayment",                      current: -23_960_000, prior: -19_100_000, indent: 1, isNegative: true },
  { label: "Net Cash from Financing",             current: 6_040_000,   prior: -1_100_000,  isTotal: true },
  { label: "Net Change in Cash",                  current: 24_900_000,  prior: 22_400_000,  isTotal: true },
  { label: "Opening Cash Balance",                current: 287_900_000, prior: 265_500_000 },
  { label: "Closing Cash Balance",                current: 312_800_000, prior: 287_900_000, isTotal: true },
];

export const EQUITY_CHANGES: FinancialStatementLine[] = [
  { label: "Opening Equity",          current: 506_450_000, prior: 437_290_000, isHeader: true },
  { label: "Add: Net Profit",         current: 80_500_000,  prior: 69_160_000,  indent: 1 },
  { label: "Less: Dividends Paid",    current: 0,           prior: 0,           indent: 1 },
  { label: "Closing Equity",          current: 586_950_000, prior: 506_450_000, isTotal: true },
];

// 12-month revenue trend
export const MONTHLY_REVENUE = [
  { month: "Jan", revenue: 62_400_000, expenses: 47_300_000, profit: 15_100_000 },
  { month: "Feb", revenue: 58_900_000, expenses: 45_800_000, profit: 13_100_000 },
  { month: "Mar", revenue: 71_200_000, expenses: 50_400_000, profit: 20_800_000 },
  { month: "Apr", revenue: 68_500_000, expenses: 48_900_000, profit: 19_600_000 },
  { month: "May", revenue: 74_800_000, expenses: 52_100_000, profit: 22_700_000 },
  { month: "Jun", revenue: 79_300_000, expenses: 54_700_000, profit: 24_600_000 },
  { month: "Jul", revenue: 73_600_000, expenses: 51_900_000, profit: 21_700_000 },
  { month: "Aug", revenue: 77_100_000, expenses: 53_400_000, profit: 23_700_000 },
  { month: "Sep", revenue: 81_400_000, expenses: 55_800_000, profit: 25_600_000 },
  { month: "Oct", revenue: 84_700_000, expenses: 57_200_000, profit: 27_500_000 },
  { month: "Nov", revenue: 75_300_000, expenses: 52_800_000, profit: 22_500_000 },
  { month: "Dec", revenue: 40_000_000, expenses: 30_000_000, profit: 10_000_000 },
];

// Expense breakdown for donut
export const EXPENSE_BREAKDOWN = [
  { name: "Staff Costs",          value: 187_200_000, color: "#0F7B5E" },
  { name: "Rent & Utilities",     value: 34_800_000,  color: "#14A87E" },
  { name: "Cost of Sales",        value: 418_820_000, color: "#F5C842" },
  { name: "Depreciation",         value: 18_400_000,  color: "#C47B2A" },
  { name: "Interest Expense",     value: 12_800_000,  color: "#DC2626" },
  { name: "Other Operating",      value: 63_450_000,  color: "#2563EB" },
];
