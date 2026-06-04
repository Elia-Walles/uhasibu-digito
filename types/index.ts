// ==================================================
// Uhasibu Digito — Domain Types
// ==================================================

// ---------- User & Auth ----------
export type UserRole =
  | "Admin"
  | "CFO"
  | "Finance Manager"
  | "Accountant"
  | "Data Entry"
  | "HR Manager"
  | "Auditor";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  avatar: string | null;
  initials: string;
  department: string;
}

// ---------- Company ----------
export interface Company {
  id: string;
  name: string;
  shortName: string;
  tin: string;
  vatNumber: string;
  efdSerial: string;
  nbaaNumber: string;
  regNumber: string;
  address: string;
  branch: string;
  email: string;
  phone: string;
  website: string;
  financialYear: { start: string; end: string };
  baseCurrency: string;
  secondaryCurrency: string;
}

// ---------- General Ledger ----------
export type GLStatus = "Draft" | "Posted";

export interface GLEntry {
  id: string;
  date: string;
  reference: string;
  narration: string;
  account: string;
  accountCode: string;
  costCentre: string;
  debit: number;
  credit: number;
  balance: number;
  postedBy: string;
  postedAt: string;
  status: GLStatus;
}

export interface JournalEntryLine {
  id: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
}

export type AccountType =
  | "Asset"
  | "Liability"
  | "Equity"
  | "Income"
  | "CostOfSales"
  | "Expense";

export interface COAAccount {
  code: string;
  name: string;
  type: AccountType;
  parentCode: string | null;
  openingBalance: number;
  movement: number;
  closingBalance: number;
  level: number;
}

// ---------- Financial Statements ----------
export interface FinancialStatementLine {
  label: string;
  current: number;
  prior: number;
  isTotal?: boolean;
  isHeader?: boolean;
  isNegative?: boolean;
  indent?: number;
}

// ---------- Invoices ----------
export type InvoiceStatus =
  | "Draft"
  | "Sent"
  | "Paid"
  | "Overdue"
  | "Cancelled";

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  vatPct: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  lines: InvoiceLine[];
  subtotal: number;
  discount: number;
  vatAmount: number;
  total: number;
  status: InvoiceStatus;
  efdNumber: string;
  notes: string;
  paidAt?: string;
}

// ---------- Customers ----------
export type CustomerStatus = "Active" | "Inactive" | "Blocked";

export interface Customer {
  id: string;
  name: string;
  contactPerson: string;
  tin: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  creditLimit: number;
  outstandingBalance: number;
  status: CustomerStatus;
  paymentTerms: string;
  totalRevenue: number;
  country?: string | undefined;
  swiftBic?: string | undefined;
  beneficiaryBank?: string | undefined;
  iban?: string | undefined;
  isInternational?: boolean | undefined;
}

// ---------- Quotations ----------
export type QuotationStatus = "Draft" | "Sent" | "Accepted" | "Expired" | "Converted";

export interface Quotation {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  date: string;
  validUntil: string;
  lines: InvoiceLine[];
  subtotal: number;
  vatAmount: number;
  total: number;
  status: QuotationStatus;
  notes?: string | undefined;
  convertedInvoiceId?: string | undefined;
}

// ---------- Inventory ----------
export type CostingMethod = "FIFO" | "LIFO" | "WeightedAverage";
export type StockStatus = "InStock" | "LowStock" | "OutOfStock";
export type MovementType = "IN" | "OUT" | "TRANSFER" | "ADJUSTMENT";

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  onHand: number;
  reorderLevel: number;
  unitCost: number;
  sellingPrice: number;
  totalValue: number;
  location: string;
  supplier: string;
  costingMethod: CostingMethod;
  status: StockStatus;
}

export interface StockMovement {
  id: string;
  date: string;
  reference: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  type: MovementType;
  quantity: number;
  unitCost: number;
  totalValue: number;
  balanceAfter: number;
  narration: string;
}

// ---------- Employees & Payroll ----------
export type EmploymentType = "Permanent" | "Contract";
export type EmployeeStatus = "Active" | "Inactive";

export interface AllowanceLine {
  id: string;
  label: string;
  amount: number;
  taxable: boolean;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  department: string;
  position: string;
  employmentType: EmploymentType;
  startDate: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  grossSalary: number;
  nssf: string;
  tin: string;
  bankName: string;
  bankAccount: string;
  phone: string;
  email: string;
  status: EmployeeStatus;
  leaveBalance: number;
  hasHeslb: boolean;
  allowances?: AllowanceLine[] | undefined;
  overtimeRate?: number | undefined;
  overtimeHoursDefault?: number | undefined;
}

export interface PayrollDeductions {
  grossPay: number;
  paye: number;
  nssf_employee: number;
  nssf_employer: number;
  wcf: number;
  sdl: number;
  heslb: number;
  netPay: number;
}

export type PayrollRunStatus = "Draft" | "Processed" | "Paid";

export interface PayrollRun {
  id: string;
  period: string;
  month: number;
  year: number;
  status: PayrollRunStatus;
  processedAt: string;
  totalGross: number;
  totalPAYE: number;
  totalNSSF: number;
  totalSDL: number;
  totalWCF: number;
  totalNet: number;
  employees: (Employee & PayrollDeductions)[];
}

// ---------- Tax ----------
export type TaxType = "VAT" | "PAYE" | "SDL" | "WCF" | "CIT" | "WHT";
export type TaxStatus = "Filed" | "Pending" | "Overdue" | "Upcoming";

export interface TaxFiling {
  id: string;
  type: TaxType;
  period: string;
  dueDate: string;
  amount: number;
  status: TaxStatus;
  filedAt?: string;
}

export interface VATTransaction {
  date: string;
  reference: string;
  description: string;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
}

export interface VATReturn {
  period: string;
  outputVAT: number;
  inputVAT: number;
  vatPayable: number;
  outputTransactions: VATTransaction[];
  inputTransactions: VATTransaction[];
}

// ---------- Fixed Assets ----------
export type AssetCategory =
  | "Vehicle"
  | "Equipment"
  | "Building"
  | "Computer"
  | "Furniture";

export type DepreciationMethod = "StraightLine" | "ReducingBalance";
export type AssetStatus = "Active" | "Disposed" | "Fully Depreciated";

export interface FixedAsset {
  id: string;
  code: string;
  name: string;
  category: AssetCategory;
  location: string;
  acquisitionDate: string;
  cost: number;
  residualValue: number;
  usefulLifeYears: number;
  depreciationMethod: DepreciationMethod;
  accumulatedDepreciation: number;
  netBookValue: number;
  status: AssetStatus;
  disposalDate?: string | undefined;
  disposalProceeds?: number | undefined;
  gainLoss?: number | undefined;
}

// ---------- Organisation ----------
export interface Department {
  id: string;
  name: string;
}

// ---------- Banking ----------
export type BankCurrency = "TZS" | "USD" | "EUR";

export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference: string;
  matched: boolean;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  currency: BankCurrency;
  balance: number;
  balanceUSD?: number;
  transactions: BankTransaction[];
}

// ---------- CRM ----------
export interface CRMCustomer extends Customer {
  leadSource: string;
  assignedTo: string;
  lastContact: string;
  notes: string;
}

export type DealStage =
  | "Lead"
  | "Qualified"
  | "Proposal"
  | "Negotiation"
  | "Won"
  | "Lost";

export interface PipelineDeal {
  id: string;
  dealName: string;
  companyName: string;
  contactName: string;
  value: number;
  probability: number;
  stage: DealStage;
  assignedTo: string;
  assignedInitials: string;
  expectedCloseDate: string;
  daysInStage: number;
  notes: string;
}

export type LeadSource = "Web" | "Referral" | "Cold Call" | "Social" | "Walk-in";
export type LeadStatus = "New" | "Contacted" | "Qualified" | "Lost";
export type LeadTemperature = "Hot" | "Warm" | "Cold";

export interface Lead {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  source: LeadSource;
  status: LeadStatus;
  temperature: LeadTemperature;
  assignedTo: string;
  expectedValue: number;
  followUpDate: string;
  createdAt: string;
}

// ---------- Procurement ----------
export type POStatus = "Draft" | "Sent" | "Received" | "Cancelled";

export interface POLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  supplierId: string;
  supplierName: string;
  date: string;
  expectedDelivery: string;
  lines: POLine[];
  subtotal: number;
  vatAmount: number;
  total: number;
  status: POStatus;
  matchStatus: {
    poConfirmed: boolean;
    grnReceived: boolean;
    invoiceReceived: boolean;
  };
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  tin: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  paymentTerms: string;
  outstandingBalance: number;
  creditLimit: number;
  performanceRating: number;
  bankName: string;
  bankAccount: string;
}

// ---------- Budgets ----------
export interface BudgetLine {
  id: string;
  lineItem: string;
  category: string;
  annualBudget: number;
  mtdBudget: number;
  mtdActual: number;
  mtdVariance: number;
  ytdBudget: number;
  ytdActual: number;
  ytdVariance: number;
}

// ---------- Digital Stamp ----------
export type StampOpinion = "Unqualified" | "Qualified" | "Adverse" | "Disclaimer";

export interface StampData {
  auditorName: string;
  auditorFirm: string;
  nbaaNumber: string;
  opinion: StampOpinion;
  signedDate: string;
  documentHash: string;
  appliedAt: string;
  appliedBy: string;
}

// ---------- Reports ----------
export type ReportCategory =
  | "Financial"
  | "Management"
  | "Tax"
  | "Operational"
  | "Payroll";

export interface Report {
  id: string;
  name: string;
  category: ReportCategory;
  description: string;
  lastGenerated: string | null;
  isAvailable: boolean;
}

// ---------- Audit Log ----------
export type AuditAction =
  | "Created"
  | "Modified"
  | "Deleted"
  | "LoggedIn"
  | "Exported"
  | "Stamped"
  | "Approved";

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: AuditAction;
  module: string;
  recordRef: string;
  ipAddress: string;
  details: string;
}

// ---------- AI ----------
export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  hasChart?: boolean;
  hasTable?: boolean;
}

export interface AIResponse {
  triggers: string[];
  response: string;
  swahili?: string;
  language: "en" | "sw";
}

// ---------- Notifications ----------
export type NotificationType = "info" | "warning" | "error" | "success";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

// ---------- Sent log (invoice send simulation) ----------
export type SendChannel = "Email" | "WhatsApp" | "Both";
export type SendStatus = "Queued" | "Delivered" | "Failed";

export interface SendLogEntry {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  channel: SendChannel;
  recipient: string;
  sentAt: string;
  status: SendStatus;
}

// ---------- Financial model assumptions ----------
export type ModelScenario = "Base" | "Upside" | "Downside";

export interface ModelAssumptions {
  scenario: ModelScenario;
  inflationRate: number;
  fxTzsPerUsd: number;
  revenueGrowth: number;
  grossMarginTarget: number;
  opexGrowth: number;
  capexAnnual: number;
  taxRate: number;
  primaryProducts: string;
}

// ---------- Audit ----------
export type AuditProcedure = "Expenses" | "Purchases" | "Sales";
export type AuditStepStatus = "Pending" | "Passed" | "Exception";

export interface AuditStep {
  key: string;
  title: string;
  description: string;
  evidence: { label: string; href?: string | undefined }[];
}

export interface AuditStepResult {
  status: AuditStepStatus;
  notes: string;
}

export interface AuditProcedureState {
  results: Record<string, AuditStepResult>;
}

export interface AuditEngagement {
  name: string;
  period: string;
  auditorName: string;
}
