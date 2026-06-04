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
import { EMPLOYEES } from "@/lib/mock-data/employees";
import { PAYROLL_RUNS } from "@/lib/mock-data/payroll";
import { TAX_FILINGS, VAT_RETURN_OCT } from "@/lib/mock-data/tax";
import { FIXED_ASSETS } from "@/lib/mock-data/assets";
import { BUDGET_LINES } from "@/lib/mock-data/budgets";
import { LEADS, PIPELINE_DEALS } from "@/lib/mock-data/pipeline";

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

  // Wave 7 — employees (+ allowances) + historical payroll runs (+ per-employee lines).
  const existingEmp = await prisma.employee.count({ where: { tenantId: tenant.id } });
  if (existingEmp === 0) {
    await prisma.employee.createMany({
      data: EMPLOYEES.map((e) => ({
        id: e.id,
        tenantId: tenant.id,
        employeeNumber: e.employeeNumber,
        firstName: e.firstName,
        lastName: e.lastName,
        fullName: e.fullName,
        department: e.department,
        position: e.position,
        employmentType: e.employmentType,
        startDate: new Date(e.startDate),
        basicSalary: e.basicSalary,
        housingAllowance: e.housingAllowance,
        transportAllowance: e.transportAllowance,
        otherAllowances: e.otherAllowances,
        grossSalary: e.grossSalary,
        nssf: e.nssf,
        tin: e.tin,
        bankName: e.bankName,
        bankAccount: e.bankAccount,
        phone: e.phone,
        email: e.email,
        status: e.status,
        leaveBalance: e.leaveBalance,
        hasHeslb: e.hasHeslb,
        overtimeRate: e.overtimeRate ?? null,
        overtimeHoursDefault: e.overtimeHoursDefault ?? null,
      })),
      skipDuplicates: true,
    });

    const allowanceData = EMPLOYEES.flatMap((e) =>
      (e.allowances ?? []).map((a) => ({
        tenantId: tenant.id,
        employeeId: e.id,
        label: a.label,
        amount: a.amount,
        taxable: a.taxable,
      })),
    );
    if (allowanceData.length > 0) {
      await prisma.employeeAllowance.createMany({ data: allowanceData, skipDuplicates: true });
    }

    await prisma.payrollRun.createMany({
      data: PAYROLL_RUNS.map((r) => ({
        id: r.id,
        tenantId: tenant.id,
        period: r.period,
        month: r.month,
        year: r.year,
        status: r.status,
        processedAt: new Date(r.processedAt),
        totalGross: r.totalGross,
        totalPAYE: r.totalPAYE,
        totalNSSF: r.totalNSSF,
        totalSDL: r.totalSDL,
        totalWCF: r.totalWCF,
        totalNet: r.totalNet,
      })),
      skipDuplicates: true,
    });

    const payrollLineData = PAYROLL_RUNS.flatMap((r) =>
      r.employees.map((e) => ({
        tenantId: tenant.id,
        payrollRunId: r.id,
        employeeId: e.id,
        employeeName: e.fullName,
        grossPay: e.grossPay,
        paye: e.paye,
        nssfEmployee: e.nssf_employee,
        nssfEmployer: e.nssf_employer,
        wcf: e.wcf,
        sdl: e.sdl,
        heslb: e.heslb,
        netPay: e.netPay,
      })),
    );
    await prisma.payrollRunEmployee.createMany({ data: payrollLineData, skipDuplicates: true });
    console.log(
      `Seeded ${EMPLOYEES.length} employees, ${PAYROLL_RUNS.length} payroll runs, ${payrollLineData.length} payroll lines.`,
    );
  } else {
    console.log(`Employees already present (${existingEmp}) — skipped payroll seed.`);
  }

  // Wave 8 — tax filings + the October VAT return (+ output/input transactions).
  const existingTax = await prisma.taxFiling.count({ where: { tenantId: tenant.id } });
  if (existingTax === 0) {
    await prisma.taxFiling.createMany({
      data: TAX_FILINGS.map((f) => ({
        id: f.id,
        tenantId: tenant.id,
        type: f.type,
        period: f.period,
        dueDate: new Date(f.dueDate),
        amount: f.amount,
        status: f.status,
        filedAt: f.filedAt ? new Date(f.filedAt) : null,
      })),
      skipDuplicates: true,
    });

    const vatId = "vat_oct_2024";
    await prisma.vATReturn.create({
      data: {
        id: vatId,
        tenantId: tenant.id,
        period: VAT_RETURN_OCT.period,
        outputVAT: VAT_RETURN_OCT.outputVAT,
        inputVAT: VAT_RETURN_OCT.inputVAT,
        vatPayable: VAT_RETURN_OCT.vatPayable,
      },
    });

    const vatTxData = [
      ...VAT_RETURN_OCT.outputTransactions.map((t) => ({ direction: "Output", t })),
      ...VAT_RETURN_OCT.inputTransactions.map((t) => ({ direction: "Input", t })),
    ].map(({ direction, t }) => ({
      tenantId: tenant.id,
      vatReturnId: vatId,
      direction,
      date: new Date(t.date),
      reference: t.reference,
      description: t.description,
      netAmount: t.netAmount,
      vatRate: t.vatRate,
      vatAmount: t.vatAmount,
    }));
    await prisma.vATTransaction.createMany({ data: vatTxData, skipDuplicates: true });
    console.log(`Seeded ${TAX_FILINGS.length} tax filings, 1 VAT return, ${vatTxData.length} VAT transactions.`);
  } else {
    console.log(`Tax filings already present (${existingTax}) — skipped tax seed.`);
  }

  // Wave 9 — fixed assets (ids fa_… preserved).
  const existingAssets = await prisma.fixedAsset.count({ where: { tenantId: tenant.id } });
  if (existingAssets === 0) {
    await prisma.fixedAsset.createMany({
      data: FIXED_ASSETS.map((a) => ({
        id: a.id,
        tenantId: tenant.id,
        code: a.code,
        name: a.name,
        category: a.category,
        location: a.location,
        acquisitionDate: new Date(a.acquisitionDate),
        cost: a.cost,
        residualValue: a.residualValue,
        usefulLifeYears: a.usefulLifeYears,
        depreciationMethod: a.depreciationMethod,
        accumulatedDepreciation: a.accumulatedDepreciation,
        netBookValue: a.netBookValue,
        status: a.status,
        disposalDate: a.disposalDate ? new Date(a.disposalDate) : null,
        disposalProceeds: a.disposalProceeds ?? null,
        gainLoss: a.gainLoss ?? null,
      })),
      skipDuplicates: true,
    });
    console.log(`Seeded ${FIXED_ASSETS.length} fixed assets.`);
  } else {
    console.log(`Fixed assets already present (${existingAssets}) — skipped asset seed.`);
  }

  // Wave 10 — budget lines + CRM leads/pipeline deals (ids b_…/lead_…/deal_… preserved).
  const existingBudgets = await prisma.budgetLine.count({ where: { tenantId: tenant.id } });
  if (existingBudgets === 0) {
    await prisma.budgetLine.createMany({
      data: BUDGET_LINES.map((b) => ({
        id: b.id,
        tenantId: tenant.id,
        lineItem: b.lineItem,
        category: b.category,
        annualBudget: b.annualBudget,
        mtdBudget: b.mtdBudget,
        mtdActual: b.mtdActual,
        mtdVariance: b.mtdVariance,
        ytdBudget: b.ytdBudget,
        ytdActual: b.ytdActual,
        ytdVariance: b.ytdVariance,
      })),
      skipDuplicates: true,
    });
    console.log(`Seeded ${BUDGET_LINES.length} budget lines.`);
  } else {
    console.log(`Budget lines already present (${existingBudgets}) — skipped budget seed.`);
  }

  const existingLeads = await prisma.lead.count({ where: { tenantId: tenant.id } });
  if (existingLeads === 0) {
    await prisma.lead.createMany({
      data: LEADS.map((l) => ({
        id: l.id,
        tenantId: tenant.id,
        name: l.name,
        company: l.company,
        phone: l.phone,
        email: l.email,
        source: l.source,
        status: l.status,
        temperature: l.temperature,
        assignedTo: l.assignedTo,
        expectedValue: l.expectedValue,
        followUpDate: l.followUpDate ? new Date(l.followUpDate) : null,
        createdAt: new Date(l.createdAt),
      })),
      skipDuplicates: true,
    });

    await prisma.pipelineDeal.createMany({
      data: PIPELINE_DEALS.map((d) => ({
        id: d.id,
        tenantId: tenant.id,
        dealName: d.dealName,
        companyName: d.companyName,
        contactName: d.contactName,
        value: d.value,
        probability: d.probability,
        stage: d.stage,
        assignedTo: d.assignedTo,
        assignedInitials: d.assignedInitials,
        expectedCloseDate: d.expectedCloseDate ? new Date(d.expectedCloseDate) : null,
        daysInStage: d.daysInStage,
        notes: d.notes,
      })),
      skipDuplicates: true,
    });
    console.log(`Seeded ${LEADS.length} leads, ${PIPELINE_DEALS.length} pipeline deals.`);
  } else {
    console.log(`Leads already present (${existingLeads}) — skipped CRM seed.`);
  }

  // Audit engagement — one per tenant (the singleton the workpapers UI edits). Step results
  // start empty and are written as the auditor works, so nothing else to seed here.
  const existingEngagement = await prisma.auditEngagement.count({ where: { tenantId: tenant.id } });
  if (existingEngagement === 0) {
    await prisma.auditEngagement.create({
      data: {
        tenantId: tenant.id,
        name: "Kilimanjaro Trading — FY 2024 Audit",
        period: "01 Jan 2024 – 31 Dec 2024",
        auditorName: "Elia Mwangi",
      },
    });
    console.log(`Seeded 1 audit engagement.`);
  } else {
    console.log(`Audit engagement already present (${existingEngagement}) — skipped audit seed.`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
