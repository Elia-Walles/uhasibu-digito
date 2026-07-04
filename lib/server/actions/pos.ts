"use server";
import type { POSSale as DbPOSSale, POSSaleLine as DbPOSSaleLine, InventoryItem as DbItem, Prisma } from "@prisma/client";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import { applyStockMovement, StockError } from "@/lib/server/stock-movement";
import { applyJournalEntry } from "@/lib/server/journal-posting";
import {
  postPOSSaleJournal,
  reversePOSSaleJournal,
  postOutputVat,
  reverseOutputVat,
  splitInclusiveVat,
  efdNumber,
} from "@/lib/server/pos-posting";
import { recordPOSSaleSchema, createPOSInvoiceSchema, refundPOSSaleSchema, posAnalyticsFilterSchema } from "@/lib/server/schemas/pos";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum, iso, dateOnly } from "@/lib/server/serialize";
import type { POSSale, POSSaleLine, PaymentMethod, POSSaleStatus, POSAnalytics } from "@/types";

const WALK_IN_NAME = "Walk-in customer (POS)";

type DbSaleWithLines = DbPOSSale & { lines: DbPOSSaleLine[] };
type SaleLine = { itemId: string; quantity: number; unitPrice: number };

function rowToSaleLine(l: DbPOSSaleLine): POSSaleLine {
  return {
    id: l.id,
    itemId: l.itemId,
    itemName: l.itemName,
    quantity: decToNum(l.quantity),
    unitPrice: decToNum(l.unitPrice),
    unitCost: decToNum(l.unitCost),
    discountPct: decToNum(l.discountPct),
    vatPct: decToNum(l.vatPct),
    lineTotal: decToNum(l.lineTotal),
    lineCost: decToNum(l.lineCost),
  };
}

function rowToSale(r: DbSaleWithLines): POSSale {
  return {
    id: r.id,
    receiptNumber: r.receiptNumber,
    branchId: r.branchId,
    branchName: r.branchName,
    invoiceId: r.invoiceId,
    cashierId: r.cashierId,
    cashierName: r.cashierName,
    customerId: r.customerId,
    customerName: r.customerName,
    paymentMethod: r.paymentMethod as PaymentMethod,
    paymentRef: r.paymentRef,
    status: r.status as POSSaleStatus,
    refundedAt: r.refundedAt ? iso(r.refundedAt) : null,
    soldAt: iso(r.soldAt),
    subtotal: decToNum(r.subtotal),
    discount: decToNum(r.discount),
    vatAmount: decToNum(r.vatAmount),
    total: decToNum(r.total),
    amountTendered: r.amountTendered === null ? null : decToNum(r.amountTendered),
    changeDue: r.changeDue === null ? null : decToNum(r.changeDue),
    costOfSales: decToNum(r.costOfSales),
    grossProfit: decToNum(r.grossProfit),
    efdNumber: r.efdNumber,
    lines: r.lines.map(rowToSaleLine),
  };
}

function dayRange(from?: string, to?: string): { gte?: Date; lte?: Date } {
  const range: { gte?: Date; lte?: Date } = {};
  if (from) range.gte = new Date(`${from}T00:00:00.000Z`);
  if (to) range.lte = new Date(`${to}T23:59:59.999Z`);
  return range;
}

/**
 * Loads the line items and enforces the stock rule up front (per-branch when a branch is
 * given). Returns the item map on success. The definitive, race-safe check happens again
 * inside the sale transaction via applyStockMovement({ enforceStock }).
 */
async function loadAndCheckStock(lines: SaleLine[], branchId?: string): Promise<Result<Map<string, DbItem>>> {
  const items = await db.inventoryItem.findMany({ where: { id: { in: lines.map((l) => l.itemId) } } });
  const byId = new Map(items.map((i) => [i.id, i]));
  const branchStock = branchId
    ? new Map((await db.branchStock.findMany({ where: { branchId } })).map((b) => [b.itemId, decToNum(b.onHand)]))
    : new Map<string, number>();

  for (const line of lines) {
    const item = byId.get(line.itemId);
    if (!item) return err("One or more products no longer exist");
    // Use the branch quantity when this item is branch-tracked; otherwise the global on-hand.
    const available = branchId && branchStock.has(line.itemId) ? branchStock.get(line.itemId)! : decToNum(item.onHand);
    if (line.quantity > available) {
      return err(`Out of stock: "${item.name}" has only ${available} available. Please adjust the stock before recording this sale.`);
    }
  }
  return ok(byId);
}

/**
 * Records a POS sale: validates stock (per-branch), computes totals with an order discount and
 * VAT-inclusive tax, captures cost-of-sales, tendered/change and payment reference, creates the
 * accounting Invoice + POSSale + lines, decrements stock at the branch, and posts the sale to the
 * General Ledger and the period VAT return — all atomically. Retries on the unique-number clash.
 */
export async function recordPOSSale(input: unknown): Promise<Result<POSSale>> {
  const parsed = recordPOSSaleSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  return withAuth(async (ctx) => {
    const stock = await loadAndCheckStock(d.lines, d.branchId);
    if (!stock.ok) return stock;
    const itemById = stock.data;

    const lineTotals = d.lines.map((l) => l.quantity * l.unitPrice);
    const lineCosts = d.lines.map((l) => decToNum(itemById.get(l.itemId)!.unitCost) * l.quantity);
    const subtotal = lineTotals.reduce((s, n) => s + n, 0);
    const discount = Math.min(d.discountAmount ?? 0, subtotal);
    const total = subtotal - discount;
    const { net, vat } = splitInclusiveVat(total);
    const costOfSales = lineCosts.reduce((s, n) => s + n, 0);
    const grossProfit = net - costOfSales;
    const amountTendered = d.amountTendered ?? null;
    const changeDue = amountTendered === null ? null : Math.max(0, amountTendered - total);

    let branchName = "";
    if (d.branchId) {
      const branch = await db.branch.findFirst({ where: { id: d.branchId } });
      if (!branch) return err("Selected branch not found");
      branchName = branch.name;
    }

    // Customer: an explicit pick, else the shared walk-in record.
    let customerId: string;
    let customerName: string;
    if (d.customerId) {
      const c = await db.customer.findFirst({ where: { id: d.customerId } });
      if (!c) return err("Selected customer not found");
      customerId = c.id;
      customerName = c.name;
    } else {
      let walkIn = await db.customer.findFirst({ where: { name: WALK_IN_NAME } });
      if (!walkIn) {
        walkIn = await db.customer.create({
          data: {
            tenantId: ctx.tenantId,
            name: WALK_IN_NAME,
            contactPerson: "",
            tin: "000-000-000",
            phone: "",
            email: "",
            city: "Dar es Salaam",
            address: "Point of Sale",
            paymentTerms: "Cash",
          },
        });
      }
      customerId = walkIn.id;
      customerName = d.customerName?.trim() || WALK_IN_NAME;
    }

    const soldAt = new Date();
    const saleDate = dateOnly(soldAt);
    const year = soldAt.getFullYear();
    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
    const invoiceBase = (await db.invoice.count({ where: { createdAt: { gte: yearStart } } })) + 1;
    const receiptBase = (await db.pOSSale.count({ where: { createdAt: { gte: yearStart } } })) + 1;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const number = `INV-${year}-${String(invoiceBase + attempt).padStart(5, "0")}`;
      const receiptNumber = `POS-${year}-${String(receiptBase + attempt).padStart(5, "0")}`;
      const efd = efdNumber(receiptBase + attempt, year);
      try {
        const sale = await db.$transaction(async (tx) => {
          const invoice = await tx.invoice.create({
            data: {
              tenantId: ctx.tenantId,
              number,
              customerId,
              customerName,
              issueDate: soldAt,
              dueDate: soldAt,
              subtotal: net,
              discount,
              vatAmount: vat,
              total,
              status: "Paid",
              paidAt: soldAt,
              efdNumber: efd,
              notes: `Point of Sale ${d.paymentMethod.toUpperCase()} sale${branchName ? ` · ${branchName}` : ""}`,
              lines: {
                create: d.lines.map((l, i) => ({
                  tenantId: ctx.tenantId,
                  description: itemById.get(l.itemId)!.name,
                  quantity: l.quantity,
                  unitPrice: l.unitPrice,
                  discountPct: 0,
                  vatPct: 18,
                  lineTotal: lineTotals[i] ?? 0,
                })),
              },
            },
          });

          const created = await tx.pOSSale.create({
            data: {
              tenantId: ctx.tenantId,
              receiptNumber,
              ...(d.branchId ? { branchId: d.branchId } : {}),
              branchName,
              ...(ctx.userId ? { cashierId: ctx.userId } : {}),
              cashierName: ctx.userName ?? "",
              customerId,
              customerName,
              paymentMethod: d.paymentMethod,
              paymentRef: d.paymentRef?.trim() ?? "",
              status: "completed",
              soldAt,
              subtotal,
              discount,
              vatAmount: vat,
              total,
              ...(amountTendered === null ? {} : { amountTendered }),
              ...(changeDue === null ? {} : { changeDue }),
              costOfSales,
              grossProfit,
              efdNumber: efd,
              journalRef: receiptNumber,
              invoiceId: invoice.id,
              lines: {
                create: d.lines.map((l, i) => ({
                  tenantId: ctx.tenantId,
                  itemId: l.itemId,
                  itemName: itemById.get(l.itemId)!.name,
                  quantity: l.quantity,
                  unitPrice: l.unitPrice,
                  unitCost: decToNum(itemById.get(l.itemId)!.unitCost),
                  discountPct: 0,
                  vatPct: 18,
                  lineTotal: lineTotals[i] ?? 0,
                  lineCost: lineCosts[i] ?? 0,
                })),
              },
            },
            include: { lines: true },
          });

          for (const line of d.lines) {
            await applyStockMovement(tx, ctx.tenantId, {
              itemId: line.itemId,
              type: "OUT",
              quantity: line.quantity,
              unitCost: decToNum(itemById.get(line.itemId)!.unitCost),
              narration: `POS sale ${receiptNumber}`,
              ...(d.branchId ? { branchId: d.branchId } : {}),
              enforceStock: true,
            });
          }

          await postPOSSaleJournal(tx, ctx.tenantId, ctx, {
            receiptNumber,
            date: saleDate,
            net,
            vat,
            total,
            costOfSales,
            paymentMethod: d.paymentMethod,
          });
          await postOutputVat(tx, ctx.tenantId, {
            date: saleDate,
            reference: receiptNumber,
            description: `POS sale ${receiptNumber}`,
            net,
            vat,
          });

          return created;
        });
        return ok(rowToSale(sale));
      } catch (e: unknown) {
        if (e instanceof StockError) return err(e.message);
        if ((e as { code?: string }).code === "P2002") continue;
        throw e;
      }
    }
    return err("Could not allocate a receipt number please retry");
  });
}

/**
 * Refund/return a POS sale: restocks each line at the sale's branch, reverses the GL entry and
 * the period VAT, cancels the linked invoice, and marks the sale refunded — all atomically.
 */
export async function refundPOSSale(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = refundPOSSaleSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { saleId } = parsed.data;

  return withAuth(async (ctx) => {
    const sale = await db.pOSSale.findFirst({ where: { id: saleId }, include: { lines: true } });
    if (!sale) return err("Sale not found");
    if (sale.status !== "completed") return err("This sale has already been refunded.");

    const saleDate = dateOnly(sale.soldAt);
    const vat = decToNum(sale.vatAmount);
    const net = decToNum(sale.total) - vat;

    await db.$transaction(async (tx) => {
      for (const l of sale.lines) {
        if (!l.itemId) continue;
        // Restore per-branch only where the item is branch-tracked; otherwise global.
        const branchRow = sale.branchId
          ? await tx.branchStock.findFirst({ where: { branchId: sale.branchId, itemId: l.itemId } })
          : null;
        await applyStockMovement(tx, ctx.tenantId, {
          itemId: l.itemId,
          type: "IN",
          quantity: decToNum(l.quantity),
          unitCost: decToNum(l.unitCost),
          narration: `Refund ${sale.receiptNumber}`,
          ...(branchRow ? { branchId: sale.branchId! } : {}),
        });
      }

      if (sale.journalRef) await reversePOSSaleJournal(tx, ctx.tenantId, sale.journalRef);
      await reverseOutputVat(tx, ctx.tenantId, {
        date: saleDate,
        reference: sale.receiptNumber,
        description: `POS sale ${sale.receiptNumber}`,
        net,
        vat,
      });
      if (sale.invoiceId) await tx.invoice.update({ where: { id: sale.invoiceId }, data: { status: "Cancelled" } });
      await tx.pOSSale.update({ where: { id: sale.id }, data: { status: "refunded", refundedAt: new Date() } });
    });

    return ok({ id: sale.id });
  });
}

/**
 * Creates a customer invoice from the POS Invoice form (status Sent = unpaid on account):
 * validates stock, resolves the customer, applies discount + VAT, decrements stock, posts the
 * credit sale to the GL (Dr Receivables), records output VAT, and bumps the customer balance.
 */
export async function createPOSInvoice(input: unknown): Promise<Result<{ id: string; number: string }>> {
  const parsed = createPOSInvoiceSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  return withAuth(async (ctx) => {
    const stock = await loadAndCheckStock(d.lines, d.branchId);
    if (!stock.ok) return stock;
    const itemById = stock.data;

    const lineTotals = d.lines.map((l) => l.quantity * l.unitPrice);
    const lineCosts = d.lines.map((l) => decToNum(itemById.get(l.itemId)!.unitCost) * l.quantity);
    const subtotal = lineTotals.reduce((s, n) => s + n, 0);
    const discount = Math.min(d.discountAmount ?? 0, subtotal);
    const total = subtotal - discount;
    const { net, vat } = splitInclusiveVat(total);
    const costOfSales = lineCosts.reduce((s, n) => s + n, 0);
    const customerName = d.customerName.trim();

    let customer = d.customerId ? await db.customer.findFirst({ where: { id: d.customerId } }) : null;
    if (!customer) customer = await db.customer.findFirst({ where: { name: customerName } });
    if (!customer) {
      customer = await db.customer.create({
        data: {
          tenantId: ctx.tenantId,
          name: customerName,
          contactPerson: "",
          tin: "",
          phone: "",
          email: "",
          city: "",
          address: "",
          paymentTerms: "Cash",
        },
      });
    }

    const issueDate = new Date();
    const saleDate = dateOnly(issueDate);
    const year = issueDate.getFullYear();
    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
    const invoiceBase = (await db.invoice.count({ where: { createdAt: { gte: yearStart } } })) + 1;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const number = `INV-${year}-${String(invoiceBase + attempt).padStart(5, "0")}`;
      const efd = efdNumber(invoiceBase + attempt, year);
      try {
        const invoice = await db.$transaction(async (tx) => {
          const created = await tx.invoice.create({
            data: {
              tenantId: ctx.tenantId,
              number,
              customerId: customer!.id,
              customerName: customer!.name,
              issueDate,
              dueDate: issueDate,
              subtotal: net,
              discount,
              vatAmount: vat,
              total,
              status: "Sent",
              efdNumber: efd,
              notes: "Point of Sale invoice",
              lines: {
                create: d.lines.map((l, i) => ({
                  tenantId: ctx.tenantId,
                  description: itemById.get(l.itemId)!.name,
                  quantity: l.quantity,
                  unitPrice: l.unitPrice,
                  discountPct: 0,
                  vatPct: 18,
                  lineTotal: lineTotals[i] ?? 0,
                })),
              },
            },
          });

          for (const line of d.lines) {
            await applyStockMovement(tx, ctx.tenantId, {
              itemId: line.itemId,
              type: "OUT",
              quantity: line.quantity,
              unitCost: decToNum(itemById.get(line.itemId)!.unitCost),
              narration: `POS invoice ${number}`,
              ...(d.branchId ? { branchId: d.branchId } : {}),
              enforceStock: true,
            });
          }

          // Credit sale: receivable rather than cash.
          const lines = [
            { accountCode: "1200", accountName: "Trade Receivables", debit: total, credit: 0 },
            { accountCode: "4100", accountName: "Sales Revenue", debit: 0, credit: net },
            ...(vat > 0 ? [{ accountCode: "2200", accountName: "Tax Payable", debit: 0, credit: vat }] : []),
            ...(costOfSales > 0
              ? [
                  { accountCode: "5000", accountName: "Cost of Sales", debit: costOfSales, credit: 0 },
                  { accountCode: "1300", accountName: "Inventory", debit: 0, credit: costOfSales },
                ]
              : []),
          ];
          await applyJournalEntry(tx, ctx.tenantId, ctx, { lines, narration: `POS invoice ${number}`, reference: number, date: saleDate });
          await postOutputVat(tx, ctx.tenantId, { date: saleDate, reference: number, description: `POS invoice ${number}`, net, vat });

          await tx.customer.update({
            where: { id: customer!.id },
            data: { outstandingBalance: decToNum(customer!.outstandingBalance) + total },
          });

          return created;
        });
        return ok({ id: invoice.id, number: invoice.number });
      } catch (e: unknown) {
        if (e instanceof StockError) return err(e.message);
        if ((e as { code?: string }).code === "P2002") continue;
        throw e;
      }
    }
    return err("Could not allocate an invoice number please retry");
  });
}

export async function listPOSSales(input?: unknown): Promise<POSSale[]> {
  const parsed = posAnalyticsFilterSchema.safeParse(input ?? {});
  const f = parsed.success ? parsed.data : {};
  return withAuth(async () => {
    const range = dayRange(f.from, f.to);
    const where: Prisma.POSSaleWhereInput = {};
    if (range.gte || range.lte) where.soldAt = range;
    if (f.branchId) where.branchId = f.branchId;
    if (f.paymentMethod) where.paymentMethod = f.paymentMethod;
    const rows = await db.pOSSale.findMany({
      where,
      orderBy: { soldAt: "desc" },
      include: { lines: true },
    });
    return rows.map(rowToSale);
  });
}

export async function getPOSAnalytics(input?: unknown): Promise<POSAnalytics> {
  const all = await listPOSSales(input);
  const sales = all.filter((s) => s.status === "completed");
  const refundedCount = all.length - sales.length;

  const totalSales = sales.reduce((s, x) => s + x.total, 0);
  const costOfSales = sales.reduce((s, x) => s + x.costOfSales, 0);
  const grossProfit = sales.reduce((s, x) => s + x.grossProfit, 0);
  const transactionCount = sales.length;

  const branchMap = new Map<string, POSAnalytics["byBranch"][number]>();
  for (const s of sales) {
    const key = s.branchId ?? "__none__";
    const entry = branchMap.get(key) ?? {
      branchId: s.branchId,
      branchName: s.branchName || "Unassigned",
      sales: 0,
      grossProfit: 0,
      transactions: 0,
    };
    entry.sales += s.total;
    entry.grossProfit += s.grossProfit;
    entry.transactions += 1;
    branchMap.set(key, entry);
  }

  const cashierMap = new Map<string, POSAnalytics["byCashier"][number]>();
  for (const s of sales) {
    const key = s.cashierId ?? "__none__";
    const entry = cashierMap.get(key) ?? {
      cashierId: s.cashierId,
      cashierName: s.cashierName || "Unknown",
      sales: 0,
      transactions: 0,
    };
    entry.sales += s.total;
    entry.transactions += 1;
    cashierMap.set(key, entry);
  }

  const methods: PaymentMethod[] = ["mpesa", "cash", "card"];
  const byPaymentMethod = methods
    .map((method) => {
      const subset = sales.filter((s) => s.paymentMethod === method);
      return { method, sales: subset.reduce((s, x) => s + x.total, 0), transactions: subset.length };
    })
    .filter((m) => m.transactions > 0);

  const dailyMap = new Map<string, POSAnalytics["daily"][number]>();
  for (const s of sales) {
    const date = s.soldAt.split("T")[0]!;
    const entry = dailyMap.get(date) ?? { date, sales: 0, costOfSales: 0, grossProfit: 0 };
    entry.sales += s.total;
    entry.costOfSales += s.costOfSales;
    entry.grossProfit += s.grossProfit;
    dailyMap.set(date, entry);
  }
  const daily = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  const itemMap = new Map<string, POSAnalytics["topItems"][number]>();
  for (const s of sales) {
    for (const l of s.lines) {
      const entry = itemMap.get(l.itemName) ?? { itemName: l.itemName, quantity: 0, sales: 0, grossProfit: 0 };
      entry.quantity += l.quantity;
      entry.sales += l.lineTotal;
      entry.grossProfit += l.lineTotal - l.lineCost;
      itemMap.set(l.itemName, entry);
    }
  }
  const topItems = [...itemMap.values()].sort((a, b) => b.sales - a.sales).slice(0, 8);

  return {
    totalSales,
    costOfSales,
    grossProfit,
    marginPct: totalSales > 0 ? (grossProfit / totalSales) * 100 : 0,
    transactionCount,
    averageBasket: transactionCount > 0 ? totalSales / transactionCount : 0,
    refundedCount,
    byBranch: [...branchMap.values()].sort((a, b) => b.sales - a.sales),
    byPaymentMethod,
    byCashier: [...cashierMap.values()].sort((a, b) => b.sales - a.sales),
    daily,
    topItems,
  };
}
