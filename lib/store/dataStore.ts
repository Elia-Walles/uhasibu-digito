import { create } from "zustand";
import type {
  Invoice, Customer, JournalEntryLine, InvoiceStatus, GLEntry,
  Department, FixedAsset,
} from "@/types";
import { INVOICES } from "@/lib/mock-data/invoices";
import { CUSTOMERS } from "@/lib/mock-data/customers";
import { GL_ENTRIES } from "@/lib/mock-data/gl-entries";
import { EMPLOYEES } from "@/lib/mock-data/employees";
import { FIXED_ASSETS } from "@/lib/mock-data/assets";

function seedDepartments(): Department[] {
  const distinct = Array.from(new Set(EMPLOYEES.map((e) => e.department))).sort();
  return distinct.map((name, i) => ({ id: `dept_${i + 1}`, name }));
}

interface DataState {
  invoices: Invoice[];
  customers: Customer[];
  glEntries: GLEntry[];
  departments: Department[];
  assets: FixedAsset[];
  addInvoice: (i: Invoice) => void;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => void;
  addCustomer: (c: Customer) => void;
  addJournalEntry: (lines: JournalEntryLine[], narration: string, reference: string) => void;
  addDepartment: (name: string) => void;
  renameDepartment: (id: string, name: string) => void;
  removeDepartment: (id: string) => void;
  countEmployeesInDepartment: (name: string) => number;
  disposeAsset: (id: string, proceeds: number, date: string) => void;
}

export const useDataStore = create<DataState>((set) => ({
  invoices: INVOICES,
  customers: CUSTOMERS,
  glEntries: GL_ENTRIES,
  departments: seedDepartments(),
  assets: FIXED_ASSETS,
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
      return { glEntries: [...newEntries, ...s.glEntries] };
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
    EMPLOYEES.filter((e) => e.department === name).length,
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
}));
