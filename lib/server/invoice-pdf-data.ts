import "server-only";
import { authDb } from "@/lib/server/auth-db";
import { decToNum, dateOnly } from "@/lib/server/serialize";

export interface InvoicePdfLine {
  description: string;
  quantity: number;
  unitPrice: number;
  vatPct: number;
  lineTotal: number;
}

export interface InvoicePdfData {
  number: string;
  efdNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  customer: { name: string; tin: string; email: string; address: string };
  company: { name: string; address: string; phone: string; email: string; tin: string; vatNumber: string; efdSerial: string };
  lines: InvoicePdfLine[];
  subtotal: number;
  vatAmount: number;
  total: number;
  amountPaid: number;
}

/**
 * Load everything needed to render a customer invoice PDF, by id (authenticated route, caller
 * checks tenant ownership) or by publicToken (public link). Uses the raw client since routes run
 * outside a request context; returns the tenantId so the auth route can enforce ownership.
 */
export async function loadInvoiceForPdf(where: { id: string } | { publicToken: string }): Promise<{ tenantId: string; data: InvoicePdfData } | null> {
  const inv = await authDb.invoice.findFirst({ where, include: { lines: true } });
  if (!inv) return null;

  const [company, customer] = await Promise.all([
    authDb.companyProfile.findFirst({ where: { tenantId: inv.tenantId } }),
    authDb.customer.findFirst({ where: { id: inv.customerId, tenantId: inv.tenantId } }),
  ]);

  const data: InvoicePdfData = {
    number: inv.number,
    efdNumber: inv.efdNumber,
    status: inv.status,
    issueDate: dateOnly(inv.issueDate),
    dueDate: dateOnly(inv.dueDate),
    customer: {
      name: inv.customerName,
      tin: customer?.tin ?? "",
      email: customer?.email ?? "",
      address: customer?.address ?? "",
    },
    company: {
      name: company?.name ?? "Your Company",
      address: company?.address ?? "",
      phone: company?.phone ?? "",
      email: company?.email ?? "",
      tin: company?.tin ?? "",
      vatNumber: company?.vatNumber ?? "",
      efdSerial: company?.efdSerial ?? "",
    },
    lines: inv.lines.map((l) => ({
      description: l.description,
      quantity: decToNum(l.quantity),
      unitPrice: decToNum(l.unitPrice),
      vatPct: decToNum(l.vatPct),
      lineTotal: decToNum(l.lineTotal),
    })),
    subtotal: decToNum(inv.subtotal),
    vatAmount: decToNum(inv.vatAmount),
    total: decToNum(inv.total),
    amountPaid: decToNum(inv.amountPaid),
  };
  return { tenantId: inv.tenantId, data };
}
