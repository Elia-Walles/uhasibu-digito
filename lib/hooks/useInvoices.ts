"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listInvoices,
  listSendLog,
  createInvoice as createInvoiceAction,
  updateInvoiceStatus as updateInvoiceStatusAction,
  sendInvoice as sendInvoiceAction,
} from "@/lib/server/actions/invoices";
import { type Result } from "@/lib/server/result";
import type { Invoice, InvoiceStatus, SendChannel, SendLogEntry } from "@/types";

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
  const [serverInvoices, setServerInvoices] = useState<Invoice[]>([]);
  const [serverSendLog, setServerSendLog] = useState<SendLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
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
