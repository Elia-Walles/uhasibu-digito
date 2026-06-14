"use server";
// READ-ONLY drill-down into any tenant's business data, for super-admin support.
// SECURITY: every reader validates `tenantId` (zod) and passes an explicit
// `where: { tenantId }` to the UNSCOPED adminDb. Only read operations are used here 
// the admin lane must never mutate tenant bookkeeping.
import { adminDb } from "@/lib/server/admin-db";
import { withAdminAuth } from "@/lib/server/with-admin-auth";
import { tenantIdSchema } from "@/lib/server/schemas/admin";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum, dateOnly } from "@/lib/server/serialize";
import type { DrilldownTable } from "./types";

const TAKE = 100;

/** Validate the tenantId arg, then run a read-only builder against adminDb. */
async function read(
  input: unknown,
  build: (tenantId: string) => Promise<DrilldownTable>,
): Promise<Result<DrilldownTable>> {
  const parsed = tenantIdSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { tenantId } = parsed.data;
  return withAdminAuth(async () => ok(await build(tenantId)));
}

export async function getTenantInvoices(input: unknown): Promise<Result<DrilldownTable>> {
  return read(input, async (tenantId) => {
    const rows = await adminDb.invoice.findMany({
      where: { tenantId },
      orderBy: { issueDate: "desc" },
      take: TAKE,
    });
    return {
      columns: [
        { key: "number", label: "Invoice #" },
        { key: "customerName", label: "Customer" },
        { key: "issueDate", label: "Issued" },
        { key: "status", label: "Status" },
        { key: "total", label: "Total", align: "right" },
      ],
      rows: rows.map((r) => ({
        number: r.number,
        customerName: r.customerName,
        issueDate: dateOnly(r.issueDate),
        status: r.status,
        total: decToNum(r.total),
      })),
    };
  });
}

export async function getTenantLedger(input: unknown): Promise<Result<DrilldownTable>> {
  return read(input, async (tenantId) => {
    const rows = await adminDb.gLEntry.findMany({
      where: { tenantId },
      orderBy: { date: "desc" },
      take: TAKE,
    });
    return {
      columns: [
        { key: "date", label: "Date" },
        { key: "reference", label: "Reference" },
        { key: "account", label: "Account" },
        { key: "debit", label: "Debit", align: "right" },
        { key: "credit", label: "Credit", align: "right" },
      ],
      rows: rows.map((r) => ({
        date: dateOnly(r.date),
        reference: r.reference,
        account: r.account,
        debit: decToNum(r.debit),
        credit: decToNum(r.credit),
      })),
    };
  });
}

export async function getTenantPayroll(input: unknown): Promise<Result<DrilldownTable>> {
  return read(input, async (tenantId) => {
    const rows = await adminDb.payrollRun.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: TAKE,
    });
    return {
      columns: [
        { key: "period", label: "Period" },
        { key: "status", label: "Status" },
        { key: "totalGross", label: "Gross", align: "right" },
        { key: "totalNet", label: "Net", align: "right" },
      ],
      rows: rows.map((r) => ({
        period: r.period,
        status: r.status,
        totalGross: decToNum(r.totalGross),
        totalNet: decToNum(r.totalNet),
      })),
    };
  });
}

export async function getTenantInventory(input: unknown): Promise<Result<DrilldownTable>> {
  return read(input, async (tenantId) => {
    const rows = await adminDb.inventoryItem.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      take: TAKE,
    });
    return {
      columns: [
        { key: "code", label: "Code" },
        { key: "name", label: "Item" },
        { key: "onHand", label: "On hand", align: "right" },
        { key: "status", label: "Status" },
        { key: "totalValue", label: "Value", align: "right" },
      ],
      rows: rows.map((r) => ({
        code: r.code,
        name: r.name,
        onHand: decToNum(r.onHand),
        status: r.status,
        totalValue: decToNum(r.totalValue),
      })),
    };
  });
}

export async function getTenantBanking(input: unknown): Promise<Result<DrilldownTable>> {
  return read(input, async (tenantId) => {
    const rows = await adminDb.bankAccount.findMany({ where: { tenantId }, orderBy: { bankName: "asc" }, take: TAKE });
    return {
      columns: [
        { key: "bankName", label: "Bank" },
        { key: "accountName", label: "Account" },
        { key: "accountNumber", label: "Number" },
        { key: "currency", label: "Currency" },
        { key: "balance", label: "Balance", align: "right" },
      ],
      rows: rows.map((r) => ({
        bankName: r.bankName,
        accountName: r.accountName,
        accountNumber: r.accountNumber,
        currency: r.currency,
        balance: decToNum(r.balance),
      })),
    };
  });
}

export async function getTenantPOS(input: unknown): Promise<Result<DrilldownTable>> {
  return read(input, async (tenantId) => {
    const rows = await adminDb.pOSSale.findMany({ where: { tenantId }, orderBy: { soldAt: "desc" }, take: TAKE });
    return {
      columns: [
        { key: "receiptNumber", label: "Receipt #" },
        { key: "soldAt", label: "Date" },
        { key: "paymentMethod", label: "Method" },
        { key: "customerName", label: "Customer" },
        { key: "total", label: "Total", align: "right" },
      ],
      rows: rows.map((r) => ({
        receiptNumber: r.receiptNumber,
        soldAt: dateOnly(r.soldAt),
        paymentMethod: r.paymentMethod,
        customerName: r.customerName,
        total: decToNum(r.total),
      })),
    };
  });
}

export async function getTenantCustomers(input: unknown): Promise<Result<DrilldownTable>> {
  return read(input, async (tenantId) => {
    const rows = await adminDb.customer.findMany({ where: { tenantId }, orderBy: { name: "asc" }, take: TAKE });
    return {
      columns: [
        { key: "name", label: "Customer" },
        { key: "phone", label: "Phone" },
        { key: "status", label: "Status" },
        { key: "outstandingBalance", label: "Outstanding", align: "right" },
        { key: "totalRevenue", label: "Revenue", align: "right" },
      ],
      rows: rows.map((r) => ({
        name: r.name,
        phone: r.phone,
        status: r.status,
        outstandingBalance: decToNum(r.outstandingBalance),
        totalRevenue: decToNum(r.totalRevenue),
      })),
    };
  });
}

export async function getTenantSuppliers(input: unknown): Promise<Result<DrilldownTable>> {
  return read(input, async (tenantId) => {
    const rows = await adminDb.supplier.findMany({ where: { tenantId }, orderBy: { name: "asc" }, take: TAKE });
    return {
      columns: [
        { key: "name", label: "Supplier" },
        { key: "phone", label: "Phone" },
        { key: "paymentTerms", label: "Terms" },
        { key: "outstandingBalance", label: "Outstanding", align: "right" },
      ],
      rows: rows.map((r) => ({
        name: r.name,
        phone: r.phone,
        paymentTerms: r.paymentTerms,
        outstandingBalance: decToNum(r.outstandingBalance),
      })),
    };
  });
}

export async function getTenantTax(input: unknown): Promise<Result<DrilldownTable>> {
  return read(input, async (tenantId) => {
    const rows = await adminDb.taxFiling.findMany({ where: { tenantId }, orderBy: { dueDate: "desc" }, take: TAKE });
    return {
      columns: [
        { key: "type", label: "Type" },
        { key: "period", label: "Period" },
        { key: "dueDate", label: "Due" },
        { key: "status", label: "Status" },
        { key: "amount", label: "Amount", align: "right" },
      ],
      rows: rows.map((r) => ({
        type: r.type,
        period: r.period,
        dueDate: dateOnly(r.dueDate),
        status: r.status,
        amount: decToNum(r.amount),
      })),
    };
  });
}

export async function getTenantFixedAssets(input: unknown): Promise<Result<DrilldownTable>> {
  return read(input, async (tenantId) => {
    const rows = await adminDb.fixedAsset.findMany({ where: { tenantId }, orderBy: { name: "asc" }, take: TAKE });
    return {
      columns: [
        { key: "code", label: "Code" },
        { key: "name", label: "Asset" },
        { key: "category", label: "Category" },
        { key: "status", label: "Status" },
        { key: "netBookValue", label: "NBV", align: "right" },
      ],
      rows: rows.map((r) => ({
        code: r.code,
        name: r.name,
        category: r.category,
        status: r.status,
        netBookValue: decToNum(r.netBookValue),
      })),
    };
  });
}
