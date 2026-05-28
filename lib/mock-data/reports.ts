import type { Report } from "@/types";

export const REPORTS: Report[] = [
  // Financial
  { id: "r_001", name: "Income Statement",          category: "Financial",   description: "P&L statement showing revenue, costs, and profitability", lastGenerated: "2024-11-01", isAvailable: true },
  { id: "r_002", name: "Balance Sheet",             category: "Financial",   description: "Statement of financial position at period end",            lastGenerated: "2024-11-01", isAvailable: true },
  { id: "r_003", name: "Cash Flow Statement",       category: "Financial",   description: "Operating, investing, and financing cash flows",           lastGenerated: "2024-11-01", isAvailable: true },
  { id: "r_004", name: "Statement of Changes in Equity", category: "Financial", description: "Movement in equity for the period",                  lastGenerated: "2024-10-15", isAvailable: true },
  { id: "r_005", name: "Trial Balance",             category: "Financial",   description: "List of all GL account balances",                          lastGenerated: "2024-11-02", isAvailable: true },
  { id: "r_006", name: "General Ledger",            category: "Financial",   description: "Detailed transaction listing by account",                  lastGenerated: "2024-11-02", isAvailable: true },
  // Management
  { id: "r_010", name: "Departmental P&L",          category: "Management",  description: "Profit & loss by department / cost centre",                lastGenerated: "2024-10-30", isAvailable: true },
  { id: "r_011", name: "Budget vs Actual",          category: "Management",  description: "Variance analysis YTD and MTD",                            lastGenerated: "2024-11-01", isAvailable: true },
  { id: "r_012", name: "Cash Flow Forecast (13-week)", category: "Management", description: "Rolling 13-week cash projection",                      lastGenerated: null,         isAvailable: true },
  { id: "r_013", name: "Profitability by Customer", category: "Management",  description: "Margin analysis by customer",                              lastGenerated: "2024-10-20", isAvailable: true },
  // Tax
  { id: "r_020", name: "VAT Return Summary",        category: "Tax",         description: "Output VAT, Input VAT, Net Payable",                       lastGenerated: "2024-11-02", isAvailable: true },
  { id: "r_021", name: "PAYE Return",               category: "Tax",         description: "Employee tax remittance to TRA",                           lastGenerated: "2024-11-05", isAvailable: true },
  { id: "r_022", name: "WHT Return",                category: "Tax",         description: "Withholding tax filing",                                   lastGenerated: "2024-10-15", isAvailable: true },
  { id: "r_023", name: "Tax Calendar Report",       category: "Tax",         description: "All upcoming deadlines and compliance status",             lastGenerated: "2024-11-02", isAvailable: true },
  // Operational
  { id: "r_030", name: "Inventory Valuation",       category: "Operational", description: "Stock value by category and location",                     lastGenerated: "2024-11-01", isAvailable: true },
  { id: "r_031", name: "Stock Movement Report",     category: "Operational", description: "IN/OUT/Transfer/Adjustments for period",                   lastGenerated: "2024-11-02", isAvailable: true },
  { id: "r_032", name: "Customer Ageing",           category: "Operational", description: "AR ageing buckets — 0/30/60/90/>90",                       lastGenerated: "2024-11-02", isAvailable: true },
  { id: "r_033", name: "Supplier Ageing",           category: "Operational", description: "AP ageing buckets",                                        lastGenerated: "2024-11-02", isAvailable: true },
  { id: "r_034", name: "Bank Reconciliation",       category: "Operational", description: "Reconciled vs unreconciled items by account",              lastGenerated: "2024-11-02", isAvailable: true },
  // Payroll
  { id: "r_040", name: "Payroll Summary",           category: "Payroll",     description: "Gross, deductions, and net by employee",                   lastGenerated: "2024-10-28", isAvailable: true },
  { id: "r_041", name: "Statutory Deductions Report", category: "Payroll",   description: "PAYE, NSSF, SDL, WCF, HESLB totals",                     lastGenerated: "2024-10-28", isAvailable: true },
  { id: "r_042", name: "Employee Headcount",        category: "Payroll",     description: "Active, new hires, leavers, by department",                lastGenerated: "2024-10-31", isAvailable: true },
];
