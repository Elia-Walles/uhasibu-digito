import type { BudgetLine } from "@/types";

export const BUDGET_LINES: BudgetLine[] = [
  { id: "b_001", lineItem: "Staff Salaries",           category: "Personnel",   annualBudget: 198_000_000, mtdBudget: 16_500_000, mtdActual: 18_000_000, mtdVariance: -1_500_000,  ytdBudget: 165_000_000, ytdActual: 167_400_000, ytdVariance: -2_400_000 },
  { id: "b_002", lineItem: "Rent",                     category: "Facilities",  annualBudget: 36_000_000,  mtdBudget: 3_000_000,  mtdActual: 3_000_000,  mtdVariance: 0,           ytdBudget: 30_000_000,  ytdActual: 30_000_000,  ytdVariance: 0 },
  { id: "b_003", lineItem: "Utilities",                category: "Facilities",  annualBudget: 12_000_000,  mtdBudget: 1_000_000,  mtdActual: 1_140_000,  mtdVariance: -140_000,    ytdBudget: 10_000_000,  ytdActual: 10_400_000,  ytdVariance: -400_000 },
  { id: "b_004", lineItem: "Transport & Fuel",         category: "Operations",  annualBudget: 24_000_000,  mtdBudget: 2_000_000,  mtdActual: 2_180_000,  mtdVariance: -180_000,    ytdBudget: 20_000_000,  ytdActual: 21_500_000,  ytdVariance: -1_500_000 },
  { id: "b_005", lineItem: "Office Supplies",          category: "Operations",  annualBudget: 8_400_000,   mtdBudget: 700_000,    mtdActual: 760_000,    mtdVariance: -60_000,     ytdBudget: 7_000_000,   ytdActual: 7_540_000,   ytdVariance: -540_000 },
  { id: "b_006", lineItem: "Marketing & Advertising",  category: "Sales",       annualBudget: 18_000_000,  mtdBudget: 1_500_000,  mtdActual: 1_200_000,  mtdVariance: 300_000,     ytdBudget: 15_000_000,  ytdActual: 13_800_000,  ytdVariance: 1_200_000 },
  { id: "b_007", lineItem: "Travel & Entertainment",   category: "Sales",       annualBudget: 12_000_000,  mtdBudget: 1_000_000,  mtdActual: 980_000,    mtdVariance: 20_000,      ytdBudget: 10_000_000,  ytdActual: 9_800_000,   ytdVariance: 200_000 },
  { id: "b_008", lineItem: "Professional Fees",        category: "Admin",       annualBudget: 9_600_000,   mtdBudget: 800_000,    mtdActual: 750_000,    mtdVariance: 50_000,      ytdBudget: 8_000_000,   ytdActual: 7_500_000,   ytdVariance: 500_000 },
  { id: "b_009", lineItem: "IT & Software",            category: "Admin",       annualBudget: 14_400_000,  mtdBudget: 1_200_000,  mtdActual: 1_150_000,  mtdVariance: 50_000,      ytdBudget: 12_000_000,  ytdActual: 11_400_000,  ytdVariance: 600_000 },
  { id: "b_010", lineItem: "Repairs & Maintenance",    category: "Operations",  annualBudget: 7_200_000,   mtdBudget: 600_000,    mtdActual: 820_000,    mtdVariance: -220_000,    ytdBudget: 6_000_000,   ytdActual: 6_400_000,   ytdVariance: -400_000 },
  { id: "b_011", lineItem: "Insurance",                category: "Admin",       annualBudget: 6_000_000,   mtdBudget: 500_000,    mtdActual: 500_000,    mtdVariance: 0,           ytdBudget: 5_000_000,   ytdActual: 5_000_000,   ytdVariance: 0 },
  { id: "b_012", lineItem: "Bank Charges",             category: "Admin",       annualBudget: 3_600_000,   mtdBudget: 300_000,    mtdActual: 285_000,    mtdVariance: 15_000,      ytdBudget: 3_000_000,   ytdActual: 2_950_000,   ytdVariance: 50_000 },
];
