"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listInvoices,
  listInvoicePayments,
  listSendLog,
  createInvoice as createInvoiceAction,
  updateInvoiceStatus as updateInvoiceStatusAction,
  updateInvoiceFull as updateInvoiceFullAction,
  recordInvoicePayment as recordInvoicePaymentAction,
  sendInvoice as sendInvoiceAction,
} from "@/lib/server/actions/invoices";
import { type Result } from "@/lib/server/result";
import type { Invoice, InvoiceStatus, InvoicePayment, SendChannel, SendLogEntry } from "@/types";

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

export interface UpdateInvoiceFullPayload {
  id: string;
  customerId: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  lines: CreateInvoiceLine[];
}

export interface RecordPaymentPayload {
  invoiceId: string;
  amount: number;
  method: string;
  reference?: string;
  paidAt?: string;
}

export interface UseInvoices {
  invoices: Invoice[];
  payments: InvoicePayment[];
  sendLog: SendLogEntry[];
  loading: boolean;
  refresh: () => Promise<void>;
  createInvoice: (payload: CreateInvoicePayload) => Promise<Result<Invoice>>;
  updateInvoiceFull: (payload: UpdateInvoiceFullPayload) => Promise<Result<Invoice>>;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => Promise<Result<Invoice>>;
  recordInvoicePayment: (payload: RecordPaymentPayload) => Promise<Result<Invoice>>;
  sendInvoice: (invoiceId: string, channel: SendChannel, recipient: string) => Promise<Result<SendLogEntry>>;
}

export function useInvoices(): UseInvoices {
  const [serverInvoices, setServerInvoices] = useState<Invoice[]>([]);
  const [serverPayments, setServerPayments] = useState<InvoicePayment[]>([]);
  const [serverSendLog, setServerSendLog] = useState<SendLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, pay, log] = await Promise.all([listInvoices(), listInvoicePayments(), listSendLog()]);
      setServerInvoices(inv);
      setServerPayments(pay);
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
    payments: serverPayments,
    sendLog: serverSendLog,
    loading,
    refresh,
    createInvoice: async (p) => {
      const res = await createInvoiceAction(p);
      if (res.ok) await refresh();
      return res;
    },
    updateInvoiceFull: async (p) => {
      const res = await updateInvoiceFullAction(p);
      if (res.ok) await refresh();
      return res;
    },
    updateInvoiceStatus: async (id, status) => {
      const res = await updateInvoiceStatusAction({ id, status });
      if (res.ok) await refresh();
      return res;
    },
    recordInvoicePayment: async (p) => {
      const res = await recordInvoicePaymentAction(p);
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
