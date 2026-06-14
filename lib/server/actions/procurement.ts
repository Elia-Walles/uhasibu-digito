"use server";
import type { Supplier as DbSupplier, PurchaseOrder as DbPO, POLine as DbPOLine } from "@prisma/client";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import {
  createSupplierSchema,
  createPurchaseOrderSchema,
  updatePOMatchSchema,
} from "@/lib/server/schemas/procurement";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum, dateOnly } from "@/lib/server/serialize";
import { computeInvoiceTotals } from "@/lib/utils/invoice-totals";
import type { Supplier, PurchaseOrder, POLine, POStatus } from "@/types";

type DbPOWithLines = DbPO & { lines: DbPOLine[] };

function rowToSupplier(r: DbSupplier): Supplier {
  return {
    id: r.id,
    name: r.name,
    contactPerson: r.contactPerson,
    tin: r.tin,
    phone: r.phone,
    email: r.email,
    city: r.city,
    address: r.address,
    paymentTerms: r.paymentTerms,
    outstandingBalance: decToNum(r.outstandingBalance),
    creditLimit: decToNum(r.creditLimit),
    performanceRating: decToNum(r.performanceRating),
    bankName: r.bankName,
    bankAccount: r.bankAccount,
  };
}

function rowToPOLine(l: DbPOLine): POLine {
  return {
    id: l.id,
    description: l.description,
    quantity: decToNum(l.quantity),
    unitPrice: decToNum(l.unitPrice),
    lineTotal: decToNum(l.lineTotal),
  };
}

function rowToPO(r: DbPOWithLines): PurchaseOrder {
  return {
    id: r.id,
    number: r.number,
    supplierId: r.supplierId,
    supplierName: r.supplierName,
    date: dateOnly(r.date),
    expectedDelivery: dateOnly(r.expectedDelivery),
    lines: r.lines.map(rowToPOLine),
    subtotal: decToNum(r.subtotal),
    vatAmount: decToNum(r.vatAmount),
    total: decToNum(r.total),
    status: r.status as POStatus,
    matchStatus: {
      poConfirmed: r.poConfirmed,
      grnReceived: r.grnReceived,
      invoiceReceived: r.invoiceReceived,
    },
  };
}

export async function listSuppliers(): Promise<Supplier[]> {
  return withAuth(async () => {
    const rows = await db.supplier.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(rowToSupplier);
  });
}

export async function createSupplier(input: unknown): Promise<Result<Supplier>> {
  const parsed = createSupplierSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  return withAuth(async (ctx) => {
    const created = await db.supplier.create({
      data: {
        tenantId: ctx.tenantId,
        name: d.name,
        contactPerson: d.contactPerson,
        tin: d.tin,
        phone: d.phone,
        email: d.email,
        city: d.city,
        address: d.address,
        paymentTerms: d.paymentTerms,
        outstandingBalance: 0,
        creditLimit: d.creditLimit,
        performanceRating: d.performanceRating,
        bankName: d.bankName,
        bankAccount: d.bankAccount,
      },
    });
    return ok(rowToSupplier(created));
  });
}

export async function listPurchaseOrders(): Promise<PurchaseOrder[]> {
  return withAuth(async () => {
    const rows = await db.purchaseOrder.findMany({
      orderBy: [{ createdAt: "desc" }, { number: "desc" }],
      include: { lines: true },
    });
    return rows.map(rowToPO);
  });
}

export async function createPurchaseOrder(input: unknown): Promise<Result<PurchaseOrder>> {
  const parsed = createPurchaseOrderSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  return withAuth(async (ctx) => {
    const supplier = await db.supplier.findFirst({ where: { id: d.supplierId } });
    if (!supplier) return err("Supplier not found");

    const { lineTotals, subtotal, vatAmount, total } = computeInvoiceTotals(
      d.lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice, discountPct: 0 })),
    );
    const year = new Date(d.date).getFullYear();
    const baseSeq = (await db.purchaseOrder.count()) + 1;
    const lineData = d.lines.map((l, i) => ({
      tenantId: ctx.tenantId,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: lineTotals[i] ?? 0,
    }));

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const seq = baseSeq + attempt;
      const number = `PO-${year}-${String(seq).padStart(5, "0")}`;
      try {
        const created = await db.purchaseOrder.create({
          data: {
            tenantId: ctx.tenantId,
            number,
            supplierId: supplier.id,
            supplierName: supplier.name,
            date: new Date(d.date),
            expectedDelivery: new Date(d.expectedDelivery),
            subtotal,
            vatAmount,
            total,
            status: "Draft",
            poConfirmed: false,
            grnReceived: false,
            invoiceReceived: false,
            lines: { create: lineData },
          },
          include: { lines: true },
        });
        return ok(rowToPO(created));
      } catch (e: unknown) {
        if ((e as { code?: string }).code === "P2002") continue;
        throw e;
      }
    }
    return err("Could not allocate a PO number please retry");
  });
}

export async function updatePOMatch(input: unknown): Promise<Result<PurchaseOrder>> {
  const parsed = updatePOMatchSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, poConfirmed, grnReceived, invoiceReceived } = parsed.data;
  return withAuth(async () => {
    try {
      const updated = await db.purchaseOrder.update({
        where: { id },
        data: {
          ...(poConfirmed !== undefined ? { poConfirmed } : {}),
          ...(grnReceived !== undefined ? { grnReceived } : {}),
          ...(invoiceReceived !== undefined ? { invoiceReceived } : {}),
        },
        include: { lines: true },
      });
      return ok(rowToPO(updated));
    } catch {
      return err("Purchase order not found");
    }
  });
}
