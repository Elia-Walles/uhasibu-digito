import { create } from "zustand";
import type {
  Invoice, Customer, JournalEntryLine, InvoiceStatus, GLEntry,
  Department, FixedAsset, Employee, BankAccount, BankTransaction,
  SendLogEntry, ModelAssumptions, AuditProcedure, AuditProcedureState,
  AuditEngagement, Lead, PipelineDeal, DealStage, InventoryItem,
  StockMovement, Supplier, PurchaseOrder, BudgetLine, Quotation,
  QuotationStatus,
} from "@/types";
import { bankIdForAccountCode } from "@/lib/utils/bank-account-mapping";

// Legacy in-memory store. The app now runs entirely on the real backend (every domain has a
// server-action hook), so the business slices below start empty and are no longer the source
// of truth — they remain only so the model-assumptions planning state has a home. New code
// should use the domain hooks (useInvoices, useCustomers, …), not this store.

const DEFAULT_ASSUMPTIONS: ModelAssumptions = {
  scenario: "Base",
  inflationRate: 0.035,
  fxTzsPerUsd: 2580,
  revenueGrowth: 0.12,
  grossMarginTarget: 0.51,
  opexGrowth: 0.08,
  capexAnnual: 62_500_000,
  taxRate: 0.30,
  primaryProducts: "Wholesale FMCG · Construction materials · Light vehicles",
};

const DEFAULT_AUDIT_ENGAGEMENT: AuditEngagement = {
  name: "Kilimanjaro Trading — FY 2024 Audit",
  period: "01 Jan 2024 – 31 Dec 2024",
  auditorName: "Elia Mwangi",
};

function emptyProcedureState(): AuditProcedureState {
  return { results: {} };
}

interface DataState {
  invoices: Invoice[];
  customers: Customer[];
  glEntries: GLEntry[];
  departments: Department[];
  assets: FixedAsset[];
  employees: Employee[];
  bankAccounts: BankAccount[];
  sendLog: SendLogEntry[];
  modelAssumptions: ModelAssumptions;
  auditEngagement: AuditEngagement;
  auditState: Record<AuditProcedure, AuditProcedureState>;
  leads: Lead[];
  deals: PipelineDeal[];
  inventory: InventoryItem[];
  stockMovements: StockMovement[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  budgetLines: BudgetLine[];
  quotations: Quotation[];
  addInvoice: (i: Invoice) => void;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => void;
  addCustomer: (c: Customer) => void;
  addJournalEntry: (lines: JournalEntryLine[], narration: string, reference: string) => void;
  editJournalEntry: (reference: string, lines: JournalEntryLine[], narration: string) => void;
  addDepartment: (name: string) => void;
  renameDepartment: (id: string, name: string) => void;
  removeDepartment: (id: string) => void;
  countEmployeesInDepartment: (name: string) => number;
  disposeAsset: (id: string, proceeds: number, date: string) => void;
  addAsset: (asset: FixedAsset) => void;
  addEmployee: (e: Employee) => void;
  updateEmployee: (id: string, patch: Partial<Employee>) => void;
  removeEmployee: (id: string) => void;
  addSendLog: (entry: SendLogEntry) => void;
  updateAssumptions: (patch: Partial<ModelAssumptions>) => void;
  setAuditStep: (procedure: AuditProcedure, stepKey: string, status: AuditProcedureState["results"][string]["status"], notes: string) => void;
  resetAuditProcedure: (procedure: AuditProcedure) => void;
  updateAuditEngagement: (patch: Partial<AuditEngagement>) => void;
  addLead: (lead: Lead) => void;
  updateLeadStatus: (id: string, status: Lead["status"]) => void;
  addDeal: (deal: PipelineDeal) => void;
  moveDeal: (id: string, stage: DealStage) => void;
  addInventoryItem: (item: InventoryItem) => void;
  recordStockMovement: (movement: StockMovement) => void;
  addSupplier: (s: Supplier) => void;
  addPurchaseOrder: (po: PurchaseOrder) => void;
  updatePOMatch: (id: string, patch: Partial<PurchaseOrder["matchStatus"]>) => void;
  addBudgetLine: (line: BudgetLine) => void;
  addQuotation: (q: Quotation) => void;
  updateQuotationStatus: (id: string, status: QuotationStatus) => void;
  convertQuotationToInvoice: (id: string) => Invoice | null;
}

function applyBankSideEffects(
  bankAccounts: BankAccount[],
  lines: JournalEntryLine[],
  narration: string,
  reference: string,
): BankAccount[] {
  const today = new Date().toISOString().split("T")[0]!;
  let result = bankAccounts;
  for (const l of lines) {
    const bankId = bankIdForAccountCode(l.accountCode);
    if (!bankId) continue;
    const delta = l.debit - l.credit;
    if (delta === 0) continue;
    result = result.map((acc) => {
      if (acc.id !== bankId) return acc;
      const newBalance = acc.balance + delta;
      const tx: BankTransaction = {
        id: `tx_gl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        date: today,
        description: narration || `Journal ${reference}`,
        debit:  delta < 0 ? -delta : 0,
        credit: delta > 0 ?  delta : 0,
        balance: newBalance,
        reference,
        matched: false,
      };
      return { ...acc, balance: newBalance, transactions: [tx, ...acc.transactions] };
    });
  }
  return result;
}

function reverseBankSideEffects(
  bankAccounts: BankAccount[],
  reference: string,
): BankAccount[] {
  // When editing, drop any GL-originated transactions matching this reference
  // and rebuild the running balance from there.
  return bankAccounts.map((acc) => {
    const filtered = acc.transactions.filter((t) => !(t.reference === reference && t.id.startsWith("tx_gl_")));
    if (filtered.length === acc.transactions.length) return acc;
    const removed = acc.transactions.filter((t) => t.reference === reference && t.id.startsWith("tx_gl_"));
    const netDelta = removed.reduce((s, t) => s + (t.credit - t.debit), 0);
    return { ...acc, balance: acc.balance - netDelta, transactions: filtered };
  });
}

export const useDataStore = create<DataState>((set, get) => ({
  invoices: [],
  customers: [],
  glEntries: [],
  departments: [],
  assets: [],
  employees: [],
  bankAccounts: [],
  sendLog: [],
  modelAssumptions: DEFAULT_ASSUMPTIONS,
  auditEngagement: DEFAULT_AUDIT_ENGAGEMENT,
  auditState: {
    Expenses:  emptyProcedureState(),
    Purchases: emptyProcedureState(),
    Sales:     emptyProcedureState(),
  },
  leads: [],
  deals: [],
  inventory: [],
  stockMovements: [],
  suppliers: [],
  purchaseOrders: [],
  budgetLines: [],
  quotations: [],
  addInvoice: (i) => set((s) => ({ invoices: [i, ...s.invoices] })),
  updateInvoiceStatus: (id, status) =>
    set((s) => ({
      invoices: s.invoices.map((inv) => (inv.id === id ? { ...inv, status } : inv)),
    })),
  addCustomer: (c) => set((s) => ({ customers: [c, ...s.customers] })),
  addJournalEntry: (lines, narration, reference) =>
    set((s) => {
      const now = new Date().toISOString();
      const newEntries: GLEntry[] = lines.map((l, i) => ({
        id: `gl_new_${Date.now()}_${i}`,
        date: now.split("T")[0]!,
        reference,
        narration,
        account: l.accountName,
        accountCode: l.accountCode,
        costCentre: "HQ",
        debit: l.debit,
        credit: l.credit,
        balance: l.debit - l.credit,
        postedBy: "Elia Mwangi",
        postedAt: now,
        status: "Posted",
      }));
      return {
        glEntries: [...newEntries, ...s.glEntries],
        bankAccounts: applyBankSideEffects(s.bankAccounts, lines, narration, reference),
      };
    }),
  editJournalEntry: (reference, lines, narration) =>
    set((s) => {
      const now = new Date().toISOString();
      const remaining = s.glEntries.filter((e) => e.reference !== reference);
      const fresh: GLEntry[] = lines.map((l, i) => ({
        id: `gl_edit_${Date.now()}_${i}`,
        date: now.split("T")[0]!,
        reference,
        narration,
        account: l.accountName,
        accountCode: l.accountCode,
        costCentre: "HQ",
        debit: l.debit,
        credit: l.credit,
        balance: l.debit - l.credit,
        postedBy: "Elia Mwangi",
        postedAt: now,
        status: "Posted",
      }));
      const cleanedBanks = reverseBankSideEffects(s.bankAccounts, reference);
      return {
        glEntries: [...fresh, ...remaining],
        bankAccounts: applyBankSideEffects(cleanedBanks, lines, narration, reference),
      };
    }),
  addDepartment: (name) =>
    set((s) => {
      const trimmed = name.trim();
      if (!trimmed) return s;
      if (s.departments.some((d) => d.name.toLowerCase() === trimmed.toLowerCase())) return s;
      return { departments: [...s.departments, { id: `dept_${Date.now()}`, name: trimmed }] };
    }),
  renameDepartment: (id, name) =>
    set((s) => ({
      departments: s.departments.map((d) => (d.id === id ? { ...d, name: name.trim() || d.name } : d)),
    })),
  removeDepartment: (id) =>
    set((s) => ({ departments: s.departments.filter((d) => d.id !== id) })),
  countEmployeesInDepartment: (name) =>
    get().employees.filter((e) => e.department === name).length,
  disposeAsset: (id, proceeds, date) =>
    set((s) => ({
      assets: s.assets.map((a) => {
        if (a.id !== id) return a;
        const nbv = a.cost - a.accumulatedDepreciation;
        const gainLoss = proceeds - nbv;
        return {
          ...a,
          status: "Disposed",
          disposalDate: date,
          disposalProceeds: proceeds,
          gainLoss,
          netBookValue: 0,
        };
      }),
    })),
  addEmployee: (e) => set((s) => ({ employees: [e, ...s.employees] })),
  updateEmployee: (id, patch) =>
    set((s) => ({
      employees: s.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),
  removeEmployee: (id) =>
    set((s) => ({ employees: s.employees.filter((e) => e.id !== id) })),
  addSendLog: (entry) => set((s) => ({ sendLog: [entry, ...s.sendLog] })),
  updateAssumptions: (patch) =>
    set((s) => ({ modelAssumptions: { ...s.modelAssumptions, ...patch } })),
  setAuditStep: (procedure, stepKey, status, notes) =>
    set((s) => {
      const current = s.auditState[procedure];
      return {
        auditState: {
          ...s.auditState,
          [procedure]: {
            results: { ...current.results, [stepKey]: { status, notes } },
          },
        },
      };
    }),
  resetAuditProcedure: (procedure) =>
    set((s) => ({
      auditState: { ...s.auditState, [procedure]: { results: {} } },
    })),
  updateAuditEngagement: (patch) =>
    set((s) => ({ auditEngagement: { ...s.auditEngagement, ...patch } })),
  addAsset: (asset) => set((s) => ({ assets: [asset, ...s.assets] })),
  addLead: (lead) => set((s) => ({ leads: [lead, ...s.leads] })),
  updateLeadStatus: (id, status) =>
    set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, status } : l)) })),
  addDeal: (deal) => set((s) => ({ deals: [deal, ...s.deals] })),
  moveDeal: (id, stage) =>
    set((s) => ({ deals: s.deals.map((d) => (d.id === id ? { ...d, stage, daysInStage: 0 } : d)) })),
  addInventoryItem: (item) => set((s) => ({ inventory: [item, ...s.inventory] })),
  recordStockMovement: (movement) =>
    set((s) => {
      const item = s.inventory.find((i) => i.id === movement.itemId);
      let inventory = s.inventory;
      if (item) {
        const delta = movement.type === "IN" ? movement.quantity
                    : movement.type === "OUT" ? -movement.quantity
                    : movement.type === "ADJUSTMENT" ? movement.quantity
                    : 0;
        const newOnHand = Math.max(0, item.onHand + delta);
        inventory = s.inventory.map((i) =>
          i.id === movement.itemId
            ? {
                ...i,
                onHand: newOnHand,
                totalValue: newOnHand * i.unitCost,
                status: newOnHand === 0 ? "OutOfStock" : newOnHand < i.reorderLevel ? "LowStock" : "InStock",
              }
            : i
        );
      }
      return {
        stockMovements: [movement, ...s.stockMovements],
        inventory,
      };
    }),
  addSupplier: (supplier) => set((s) => ({ suppliers: [supplier, ...s.suppliers] })),
  addPurchaseOrder: (po) => set((s) => ({ purchaseOrders: [po, ...s.purchaseOrders] })),
  updatePOMatch: (id, patch) =>
    set((s) => ({
      purchaseOrders: s.purchaseOrders.map((p) =>
        p.id === id ? { ...p, matchStatus: { ...p.matchStatus, ...patch } } : p
      ),
    })),
  addBudgetLine: (line) => set((s) => ({ budgetLines: [...s.budgetLines, line] })),
  addQuotation: (q) => set((s) => ({ quotations: [q, ...s.quotations] })),
  updateQuotationStatus: (id, status) =>
    set((s) => ({ quotations: s.quotations.map((q) => (q.id === id ? { ...q, status } : q)) })),
  convertQuotationToInvoice: (id) => {
    const q = get().quotations.find((x) => x.id === id);
    if (!q) return null;
    const stamp = Date.now();
    const inv: Invoice = {
      id: `inv_quo_${stamp}`,
      number: `INV-2024-${String(Math.floor(stamp / 100) % 100000).padStart(5, "0")}`,
      customerId: q.customerId,
      customerName: q.customerName,
      issueDate: new Date().toISOString().split("T")[0]!,
      dueDate:   new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]!,
      lines: q.lines,
      subtotal: q.subtotal,
      discount: 0,
      vatAmount: q.vatAmount,
      total: q.total,
      status: "Sent",
      efdNumber: `EFD-2024-${String(stamp).slice(-8)}`,
      notes: `Converted from quotation ${q.number}. ${q.notes ?? ""}`.trim(),
    };
    set((s) => ({
      invoices: [inv, ...s.invoices],
      quotations: s.quotations.map((x) => (x.id === id ? { ...x, status: "Converted", convertedInvoiceId: inv.id } : x)),
    }));
    return inv;
  },
}));
