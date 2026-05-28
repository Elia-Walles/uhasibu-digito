import { create } from "zustand";
import type { Invoice, Customer, JournalEntryLine, InvoiceStatus, GLEntry } from "@/types";
import { INVOICES } from "@/lib/mock-data/invoices";
import { CUSTOMERS } from "@/lib/mock-data/customers";
import { GL_ENTRIES } from "@/lib/mock-data/gl-entries";

interface DataState {
  invoices: Invoice[];
  customers: Customer[];
  glEntries: GLEntry[];
  addInvoice: (i: Invoice) => void;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => void;
  addCustomer: (c: Customer) => void;
  addJournalEntry: (lines: JournalEntryLine[], narration: string, reference: string) => void;
}

export const useDataStore = create<DataState>((set) => ({
  invoices: INVOICES,
  customers: CUSTOMERS,
  glEntries: GL_ENTRIES,
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
}));
