import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { createMariaDbAdapter } from "../lib/server/db-adapter";
import { CUSTOMERS } from "@/lib/mock-data/customers";
import { INVOICES } from "@/lib/mock-data/invoices";
import { COA, GL_ENTRIES } from "@/lib/mock-data/gl-entries";
import { BANK_ACCOUNTS } from "@/lib/mock-data/bank-accounts";
import { INVENTORY, STOCK_MOVEMENTS } from "@/lib/mock-data/inventory";
import { SUPPLIERS, PURCHASE_ORDERS } from "@/lib/mock-data/suppliers";

// Demo seed for Kilimanjaro Trading Co. Runs via `npm run db:seed` (tsx) once real
// `.env` credentials exist. Uses the raw client (no tenant extension), so tenantId is
// passed explicitly. Idempotent — safe to re-run. Extended with domain data in later
// waves; Wave 1 seeds only what auth + departments need.
const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });

// Distinct departments from lib/mock-data/employees.ts (hardcoded so the seed has no
// runtime dependency on the alias-importing mock module).
const DEPARTMENTS = ["Admin", "Finance", "HR", "Logistics", "Sales", "Warehouse", "Zanzibar"];

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "kilimanjaro" },
    update: {},
    create: { name: "Kilimanjaro Trading Company Limited", slug: "kilimanjaro", tier: "pro" },
  });

  const passwordHash = await hash("Demo@2024", 12);
  await prisma.user.upsert({
    where: { email: "demo@uhasibudigito.co.tz" },
    update: { name: "Elia Mwangi", role: "CFO", initials: "EM", passwordHash, tenantId: tenant.id },
    create: {
      email: "demo@uhasibudigito.co.tz",
      name: "Elia Mwangi",
      role: "CFO",
      initials: "EM",
      passwordHash,
      tenantId: tenant.id,
    },
  });

  for (const name of DEPARTMENTS) {
    const existing = await prisma.department.findFirst({ where: { tenantId: tenant.id, name } });
    if (!existing) {
      await prisma.department.create({ data: { tenantId: tenant.id, name } });
    }
  }

  console.log(`Seeded tenant "${tenant.slug}" — demo user + ${DEPARTMENTS.length} departments.`);

  // Business data — batched so remote TiDB latency stays bearable. Customer ids are
  // preserved so the mock invoices' customerId FKs line up. Skip if already seeded.
  const existingCustomers = await prisma.customer.count({ where: { tenantId: tenant.id } });
  if (existingCustomers === 0) {
    await prisma.customer.createMany({
      data: CUSTOMERS.map((c) => ({
        id: c.id,
        tenantId: tenant.id,
        name: c.name,
        contactPerson: c.contactPerson,
        tin: c.tin,
        phone: c.phone,
        email: c.email,
        city: c.city,
        address: c.address,
        creditLimit: c.creditLimit,
        outstandingBalance: c.outstandingBalance,
        status: c.status,
        paymentTerms: c.paymentTerms,
        totalRevenue: c.totalRevenue,
        country: c.country ?? null,
        swiftBic: c.swiftBic ?? null,
        beneficiaryBank: c.beneficiaryBank ?? null,
        iban: c.iban ?? null,
        isInternational: c.isInternational ?? null,
      })),
      skipDuplicates: true,
    });

    await prisma.invoice.createMany({
      data: INVOICES.map((inv) => ({
        id: inv.id,
        tenantId: tenant.id,
        number: inv.number,
        customerId: inv.customerId,
        customerName: inv.customerName,
        issueDate: new Date(inv.issueDate),
        dueDate: new Date(inv.dueDate),
        subtotal: inv.subtotal,
        discount: inv.discount,
        vatAmount: inv.vatAmount,
        total: inv.total,
        status: inv.status,
        efdNumber: inv.efdNumber,
        notes: inv.notes,
        paidAt: inv.paidAt ? new Date(inv.paidAt) : null,
      })),
      skipDuplicates: true,
    });

    const lineData = INVOICES.flatMap((inv) =>
      inv.lines.map((l) => ({
        tenantId: tenant.id,
        invoiceId: inv.id,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountPct: l.discountPct,
        vatPct: l.vatPct,
        lineTotal: l.lineTotal,
      })),
    );
    await prisma.invoiceLine.createMany({ data: lineData, skipDuplicates: true });
    console.log(`Seeded ${CUSTOMERS.length} customers, ${INVOICES.length} invoices, ${lineData.length} lines.`);
  } else {
    console.log(`Customers already present (${existingCustomers}) — skipped business-data seed.`);
  }

  // Wave 3 — COA + GL + bank accounts/transactions. Bank ids (ba_001..ba_004) preserved
  // so bankIdForAccountCode resolves when journal entries post against bank codes.
  const existingCOA = await prisma.cOAAccount.count({ where: { tenantId: tenant.id } });
  if (existingCOA === 0) {
    await prisma.cOAAccount.createMany({
      data: COA.map((a) => ({
        tenantId: tenant.id,
        code: a.code,
        name: a.name,
        type: a.type,
        parentCode: a.parentCode,
        openingBalance: a.openingBalance,
        movement: a.movement,
        closingBalance: a.closingBalance,
        level: a.level,
      })),
      skipDuplicates: true,
    });

    await prisma.gLEntry.createMany({
      data: GL_ENTRIES.map((e) => ({
        id: e.id,
        tenantId: tenant.id,
        date: new Date(e.date),
        reference: e.reference,
        narration: e.narration,
        account: e.account,
        accountCode: e.accountCode,
        costCentre: e.costCentre,
        debit: e.debit,
        credit: e.credit,
        balance: e.balance,
        postedBy: e.postedBy,
        postedAt: new Date(e.postedAt),
        status: e.status,
      })),
      skipDuplicates: true,
    });

    await prisma.bankAccount.createMany({
      data: BANK_ACCOUNTS.map((a) => ({
        id: a.id,
        tenantId: tenant.id,
        bankName: a.bankName,
        accountName: a.accountName,
        accountNumber: a.accountNumber,
        currency: a.currency,
        balance: a.balance,
        balanceUSD: a.balanceUSD ?? null,
      })),
      skipDuplicates: true,
    });

    const bankTxData = BANK_ACCOUNTS.flatMap((a) =>
      a.transactions.map((t) => ({
        tenantId: tenant.id,
        bankAccountId: a.id,
        date: new Date(t.date),
        description: t.description,
        debit: t.debit,
        credit: t.credit,
        balance: t.balance,
        reference: t.reference,
        matched: t.matched,
      })),
    );
    await prisma.bankTransaction.createMany({ data: bankTxData, skipDuplicates: true });
    console.log(
      `Seeded ${COA.length} COA accounts, ${GL_ENTRIES.length} GL entries, ${BANK_ACCOUNTS.length} bank accounts, ${bankTxData.length} bank txns.`,
    );
  } else {
    console.log(`COA already present (${existingCOA}) — skipped GL/bank seed.`);
  }

  // Wave 4 — inventory items + stock movements. Item ids (inv_001..) preserved so POS
  // cart itemIds and the seeded movements line up.
  const existingInv = await prisma.inventoryItem.count({ where: { tenantId: tenant.id } });
  if (existingInv === 0) {
    await prisma.inventoryItem.createMany({
      data: INVENTORY.map((it) => ({
        id: it.id,
        tenantId: tenant.id,
        code: it.code,
        name: it.name,
        category: it.category,
        unit: it.unit,
        onHand: it.onHand,
        reorderLevel: it.reorderLevel,
        unitCost: it.unitCost,
        sellingPrice: it.sellingPrice,
        totalValue: it.totalValue,
        location: it.location,
        supplier: it.supplier,
        costingMethod: it.costingMethod,
        status: it.status,
      })),
      skipDuplicates: true,
    });

    await prisma.stockMovement.createMany({
      data: STOCK_MOVEMENTS.map((m) => ({
        id: m.id,
        tenantId: tenant.id,
        itemId: m.itemId,
        date: new Date(m.date),
        reference: m.reference,
        itemName: m.itemName,
        itemCode: m.itemCode,
        type: m.type,
        quantity: m.quantity,
        unitCost: m.unitCost,
        totalValue: m.totalValue,
        balanceAfter: m.balanceAfter,
        narration: m.narration,
      })),
      skipDuplicates: true,
    });
    console.log(`Seeded ${INVENTORY.length} inventory items, ${STOCK_MOVEMENTS.length} stock movements.`);
  } else {
    console.log(`Inventory already present (${existingInv}) — skipped inventory seed.`);
  }

  // Wave 6 — suppliers + purchase orders (+ lines). Ids preserved; matchStatus → 3 cols.
  const existingSup = await prisma.supplier.count({ where: { tenantId: tenant.id } });
  if (existingSup === 0) {
    await prisma.supplier.createMany({
      data: SUPPLIERS.map((s) => ({
        id: s.id,
        tenantId: tenant.id,
        name: s.name,
        contactPerson: s.contactPerson,
        tin: s.tin,
        phone: s.phone,
        email: s.email,
        city: s.city,
        address: s.address,
        paymentTerms: s.paymentTerms,
        outstandingBalance: s.outstandingBalance,
        creditLimit: s.creditLimit,
        performanceRating: s.performanceRating,
        bankName: s.bankName,
        bankAccount: s.bankAccount,
      })),
      skipDuplicates: true,
    });

    await prisma.purchaseOrder.createMany({
      data: PURCHASE_ORDERS.map((p) => ({
        id: p.id,
        tenantId: tenant.id,
        number: p.number,
        supplierId: p.supplierId,
        supplierName: p.supplierName,
        date: new Date(p.date),
        expectedDelivery: new Date(p.expectedDelivery),
        subtotal: p.subtotal,
        vatAmount: p.vatAmount,
        total: p.total,
        status: p.status,
        poConfirmed: p.matchStatus.poConfirmed,
        grnReceived: p.matchStatus.grnReceived,
        invoiceReceived: p.matchStatus.invoiceReceived,
      })),
      skipDuplicates: true,
    });

    const poLineData = PURCHASE_ORDERS.flatMap((p) =>
      p.lines.map((l) => ({
        tenantId: tenant.id,
        purchaseOrderId: p.id,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
      })),
    );
    await prisma.pOLine.createMany({ data: poLineData, skipDuplicates: true });
    console.log(`Seeded ${SUPPLIERS.length} suppliers, ${PURCHASE_ORDERS.length} POs, ${poLineData.length} PO lines.`);
  } else {
    console.log(`Suppliers already present (${existingSup}) — skipped procurement seed.`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
