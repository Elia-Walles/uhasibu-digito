"use server";
import type { POSSale as DbPOSSale, POSSaleLine as DbPOSSaleLine, Prisma } from "@prisma/client";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import { applyStockMovement } from "@/lib/server/stock-movement";
import { recordPOSSaleSchema, posAnalyticsFilterSchema } from "@/lib/server/schemas/pos";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum, iso } from "@/lib/server/serialize";
import { computeInvoiceTotals } from "@/lib/utils/invoice-totals";
import type { POSSale, POSSaleLine, PaymentMethod, POSAnalytics } from "@/types";

const WALK_IN_NAME = "Walk-in customer (POS)";

type DbSaleWithLines = DbPOSSale & { lines: DbPOSSaleLine[] };

function rowToSaleLine(l: DbPOSSaleLine): POSSaleLine {
  return {
    id: l.id,
    itemId: l.itemId,
    itemName: l.itemName,
    quantity: decToNum(l.quantity),
    unitPrice: decToNum(l.unitPrice),
    unitCost: decToNum(l.unitCost),
    lineTotal: decToNum(l.lineTotal),
    lineCost: decToNum(l.lineCost),
  };
}

function rowToSale(r: DbSaleWithLines): POSSale {
  return {
    id: r.id,
    receiptNumber: r.receiptNumber,
    efdNumber: r.efdNumber,
    branchId: r.branchId,
    branchName: r.branchName,
    invoiceId: r.invoiceId,
    cashierId: r.cashierId,
    cashierName: r.cashierName,
    customerName: r.customerName,
    paymentMethod: r.paymentMethod as PaymentMethod,
    soldAt: iso(r.soldAt),
    subtotal: decToNum(r.subtotal),
    vatAmount: decToNum(r.vatAmount),
    discount: decToNum(r.discount),
    total: decToNum(r.total),
    costOfSales: decToNum(r.costOfSales),
    grossProfit: decToNum(r.grossProfit),
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
 * Records a completed POS sale atomically: ensures a walk-in customer, creates the EFD
 * invoice (status Paid), the POSSale + lines (with cost-of-sales captured), and decrements
 * stock for every line. Retries on the unique-number clash from concurrent sales.
 */
export async function recordPOSSale(input: unknown): Promise<Result<POSSale>> {
  const parsed = recordPOSSaleSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  return withAuth(async (ctx) => {
    const itemIds = d.lines.map((l) => l.itemId);
    const items = await db.inventoryItem.findMany({ where: { id: { in: itemIds } } });
    const itemById = new Map(items.map((i) => [i.id, i]));
    for (const line of d.lines) {
      if (!itemById.has(line.itemId)) return err("One or more products no longer exist");
    }

    const { lineTotals, subtotal, vatAmount, total } = computeInvoiceTotals(
      d.lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice, discountPct: 0 })),
    );
    const lineCosts = d.lines.map((l) => decToNum(itemById.get(l.itemId)!.unitCost) * l.quantity);
    const costOfSales = lineCosts.reduce((s, n) => s + n, 0);
    const grossProfit = subtotal - costOfSales;
    const customerName = d.customerName?.trim() || "Walk-in customer";

    let branchName = "";
    if (d.branchId) {
      const branch = await db.branch.findFirst({ where: { id: d.branchId } });
      if (!branch) return err("Selected branch not found");
      branchName = branch.name;
    }

    // Ensure the single walk-in POS customer exists (invoices require a customer FK).
    let walkIn = await db.customer.findFirst({ where: { name: WALK_IN_NAME } });
    if (!walkIn) {
      walkIn = await db.customer.create({
        data: {
          tenantId: ctx.tenantId,
          name: WALK_IN_NAME,
          contactPerson: "—",
          tin: "000-000-000",
          phone: "—",
          email: "—",
          city: "Dar es Salaam",
          address: "Point of Sale",
          paymentTerms: "Cash",
        },
      });
    }

    const soldAt = new Date();
    const year = soldAt.getFullYear();
    const invoiceBase = (await db.invoice.count()) + 1;
    const receiptBase = (await db.pOSSale.count()) + 1;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const seq = invoiceBase + attempt;
      const rseq = receiptBase + attempt;
      const number = `INV-${year}-${String(seq).padStart(5, "0")}`;
      const efdNumber = `EFD-${year}-${String(seq).padStart(8, "0")}`;
      const receiptNumber = `POS-${year}-${String(rseq).padStart(5, "0")}`;
      try {
        const sale = await db.$transaction(async (tx) => {
          const invoice = await tx.invoice.create({
            data: {
              tenantId: ctx.tenantId,
              number,
              customerId: walkIn!.id,
              customerName,
              issueDate: soldAt,
              dueDate: soldAt,
              subtotal,
              discount: 0,
              vatAmount,
              total,
              status: "Paid",
              paidAt: soldAt,
              efdNumber,
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
              efdNumber,
              ...(d.branchId ? { branchId: d.branchId } : {}),
              branchName,
              ...(ctx.userId ? { cashierId: ctx.userId } : {}),
              cashierName: "",
              customerName,
              paymentMethod: d.paymentMethod,
              soldAt,
              subtotal,
              vatAmount,
              discount: 0,
              total,
              costOfSales,
              grossProfit,
              invoiceId: invoice.id,
              lines: {
                create: d.lines.map((l, i) => ({
                  tenantId: ctx.tenantId,
                  itemId: l.itemId,
                  itemName: itemById.get(l.itemId)!.name,
                  quantity: l.quantity,
                  unitPrice: l.unitPrice,
                  unitCost: decToNum(itemById.get(l.itemId)!.unitCost),
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
            });
          }

          return created;
        });
        return ok(rowToSale(sale));
      } catch (e: unknown) {
        if ((e as { code?: string }).code === "P2002") continue;
        throw e;
      }
    }
    return err("Could not allocate a receipt number — please retry");
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
  const sales = await listPOSSales(input);

  const totalSales = sales.reduce((s, x) => s + x.total, 0);
  const costOfSales = sales.reduce((s, x) => s + x.costOfSales, 0);
  const grossProfit = sales.reduce((s, x) => s + x.grossProfit, 0);
  const vatCollected = sales.reduce((s, x) => s + x.vatAmount, 0);
  const netSales = sales.reduce((s, x) => s + x.subtotal, 0);
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
    marginPct: netSales > 0 ? (grossProfit / netSales) * 100 : 0,
    transactionCount,
    averageBasket: transactionCount > 0 ? totalSales / transactionCount : 0,
    vatCollected,
    byBranch: [...branchMap.values()].sort((a, b) => b.sales - a.sales),
    byPaymentMethod,
    daily,
    topItems,
  };
}
