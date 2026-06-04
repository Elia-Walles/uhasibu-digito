"use client";
import { useCallback, useEffect, useState } from "react";
import { INVOICES_BACKEND_ENABLED } from "@/lib/flags";
import { useDataStore } from "@/lib/store/dataStore";
import {
  listInvoices,
  listSendLog,
  createInvoice as createInvoiceAction,
  updateInvoiceStatus as updateInvoiceStatusAction,
  sendInvoice as sendInvoiceAction,
} from "@/lib/server/actions/invoices";
import { ok, type Result } from "@/lib/server/result";
import { computeInvoiceTotals } from "@/lib/utils/invoice-totals";
import type { Invoice, InvoiceLine, InvoiceStatus, SendChannel, SendLogEntry } from "@/types";

export interface CreateInvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  vatPct: number;
}

export interface CreateInvoicePayload {
  customerId: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  status: "Draft" | "Sent" | "Paid";
  paidAt?: string;
  lines: CreateInvoiceLine[];
}

export interface UseInvoices {
  invoices: Invoice[];
  sendLog: SendLogEntry[];
  loading: boolean;
  createInvoice: (payload: CreateInvoicePayload) => Promise<Result<Invoice>>;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => Promise<Result<Invoice>>;
  sendInvoice: (invoiceId: string, channel: SendChannel, recipient: string) => Promise<Result<SendLogEntry>>;
}

export function useInvoices(): UseInvoices {
  const mockInvoices = useDataStore((s) => s.invoices);
  const mockSendLog = useDataStore((s) => s.sendLog);
  const mockCustomers = useDataStore((s) => s.customers);
  const mockAddInvoice = useDataStore((s) => s.addInvoice);
  const mockUpdateStatus = useDataStore((s) => s.updateInvoiceStatus);
  const mockAddSendLog = useDataStore((s) => s.addSendLog);

  const [serverInvoices, setServerInvoices] = useState<Invoice[]>([]);
  const [serverSendLog, setServerSendLog] = useState<SendLogEntry[]>([]);
  const [loading, setLoading] = useState(INVOICES_BACKEND_ENABLED);

  const refresh = useCallback(async () => {
    if (!INVOICES_BACKEND_ENABLED) return;
    setLoading(true);
    try {
      const [inv, log] = await Promise.all([listInvoices(), listSendLog()]);
      setServerInvoices(inv);
      setServerSendLog(log);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  if (!INVOICES_BACKEND_ENABLED) {
    return {
      invoices: mockInvoices,
      sendLog: mockSendLog,
      loading: false,
      createInvoice: async (p) => {
        const totals = computeInvoiceTotals(p.lines);
        const stamp = Date.now();
        const lines: InvoiceLine[] = p.lines.map((l, i) => ({
          id: `ln_${stamp}_${i}`,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountPct: l.discountPct,
          vatPct: l.vatPct,
          lineTotal: totals.lineTotals[i] ?? 0,
        }));
        const inv: Invoice = {
          id: `inv_new_${stamp}`,
          number: `INV-2024-${String(Math.floor(Math.random() * 90000) + 10000)}`,
          customerId: p.customerId,
          customerName: mockCustomers.find((c) => c.id === p.customerId)?.name ?? "Customer",
          issueDate: p.issueDate,
          dueDate: p.dueDate,
          lines,
          subtotal: totals.subtotal,
          discount: 0,
          vatAmount: totals.vatAmount,
          total: totals.total,
          status: p.status,
          efdNumber: `EFD-2024-${String(stamp % 99999999).padStart(8, "0")}`,
          notes: p.notes,
          ...(p.status === "Paid" ? { paidAt: p.paidAt ?? new Date().toISOString() } : {}),
        };
        mockAddInvoice(inv);
        return ok(inv);
      },
      updateInvoiceStatus: async (id, status) => {
        mockUpdateStatus(id, status);
        const found = mockInvoices.find((i) => i.id === id);
        return ok(found ?? ({ id } as Invoice));
      },
      sendInvoice: async (invoiceId, channel, recipient) => {
        const inv = mockInvoices.find((i) => i.id === invoiceId);
        const entry: SendLogEntry = {
          id: `send_${Date.now()}`,
          invoiceId,
          invoiceNumber: inv?.number ?? "",
          customerName: inv?.customerName ?? "",
          channel,
          recipient,
          sentAt: new Date().toISOString(),
          status: "Delivered",
        };
        mockAddSendLog(entry);
        return ok(entry);
      },
    };
  }

  return {
    invoices: serverInvoices,
    sendLog: serverSendLog,
    loading,
    createInvoice: async (p) => {
      const res = await createInvoiceAction(p);
      if (res.ok) await refresh();
      return res;
    },
    updateInvoiceStatus: async (id, status) => {
      const res = await updateInvoiceStatusAction({ id, status });
      if (res.ok) await refresh();
      return res;
    },
    sendInvoice: async (invoiceId, channel, recipient) => {
      const res = await sendInvoiceAction({ invoiceId, channel, recipient });
      if (res.ok) await refresh();
      return res;
    },
  };
}
