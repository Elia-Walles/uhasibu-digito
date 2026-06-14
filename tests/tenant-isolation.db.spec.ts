import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { applyJournalEntry, reverseJournalEntry } from "@/lib/server/journal-posting";
import { applyStockMovement } from "@/lib/server/stock-movement";
import { buildPayrollRun } from "@/lib/server/payroll-run";
import { calculateDeductions } from "@/lib/utils/paye";
import { applyAssetDisposal } from "@/lib/server/asset-disposal";

// Real-DB tenant-isolation gate. Opt-in: runs only with RUN_DB_TESTS=1 against a
// scratch database (the Wave 0 unit suite stays the always-on gate). Modules are
// imported dynamically inside the suite so this file is import-safe when skipped 
// nothing constructs a Prisma client unless the suite actually runs.
const RUN = process.env.RUN_DB_TESTS === "1";

type Db = typeof import("@/lib/server/db").db;
type AuthDb = typeof import("@/lib/server/auth-db").authDb;
type RunWithContext = typeof import("@/lib/server/request-context").runWithContext;

describe.skipIf(!RUN)("tenant isolation (real DB)", () => {
  let db: Db;
  let authDb: AuthDb;
  let runWithContext: RunWithContext;
  let tenantA = "";
  let tenantB = "";

  beforeAll(async () => {
    ({ db } = await import("@/lib/server/db"));
    ({ authDb } = await import("@/lib/server/auth-db"));
    ({ runWithContext } = await import("@/lib/server/request-context"));

    const stamp = Date.now();
    const a = await authDb.tenant.create({ data: { name: "ISO A", slug: `iso-a-${stamp}` } });
    const b = await authDb.tenant.create({ data: { name: "ISO B", slug: `iso-b-${stamp}` } });
    tenantA = a.id;
    tenantB = b.id;
  }, 60_000);

  afterAll(async () => {
    if (authDb) {
      const ids = { tenantId: { in: [tenantA, tenantB] } };
      await authDb.budgetLine.deleteMany({ where: ids });
      await authDb.pipelineDeal.deleteMany({ where: ids });
      await authDb.lead.deleteMany({ where: ids });
      await authDb.vATTransaction.deleteMany({ where: ids });
      await authDb.vATReturn.deleteMany({ where: ids });
      await authDb.taxFiling.deleteMany({ where: ids });
      await authDb.pOLine.deleteMany({ where: ids });
      await authDb.purchaseOrder.deleteMany({ where: ids });
      await authDb.supplier.deleteMany({ where: ids });
      await authDb.quotationLine.deleteMany({ where: ids });
      await authDb.quotation.deleteMany({ where: ids });
      await authDb.invoiceLine.deleteMany({ where: ids });
      await authDb.invoice.deleteMany({ where: ids });
      await authDb.customer.deleteMany({ where: ids });
      await authDb.department.deleteMany({ where: ids });
      await authDb.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
      await authDb.$disconnect();
    }
  }, 60_000);

  it("scopes reads, overrides malicious tenantId, and blocks cross-tenant writes", async () => {
    const ctxA = { tenantId: tenantA, userId: "u_a", role: "CFO" as const };
    const ctxB = { tenantId: tenantB, userId: "u_b", role: "CFO" as const };

    await runWithContext(ctxA, async () => {
      await db.department.create({ data: { name: "A-only", tenantId: tenantA } });
    });
    const bDept = await runWithContext(ctxB, async () =>
      db.department.create({ data: { name: "B-only", tenantId: tenantB } }),
    );

    // A sees only its own
    const aList = await runWithContext(ctxA, async () => db.department.findMany());
    expect(aList.map((d) => d.name)).toContain("A-only");
    expect(aList.map((d) => d.name)).not.toContain("B-only");

    // Malicious where.tenantId = B is overridden → still no B rows
    const aMalicious = await runWithContext(ctxA, async () =>
      db.department.findMany({ where: { tenantId: tenantB } }),
    );
    expect(aMalicious.every((d) => d.name !== "B-only")).toBe(true);

    // A cannot delete B's row
    await runWithContext(ctxA, async () => {
      await expect(db.department.delete({ where: { id: bDept.id } })).rejects.toThrow();
    });

    // B still sees its own proving the delete above did not fall through
    const bList = await runWithContext(ctxB, async () => db.department.findMany());
    expect(bList.map((d) => d.name)).toContain("B-only");
  }, 60_000);

  it("isolates invoices (with nested lines) across tenants", async () => {
    const ctxA = { tenantId: tenantA, userId: "u_a", role: "CFO" as const };
    const ctxB = { tenantId: tenantB, userId: "u_b", role: "CFO" as const };
    const stamp = Date.now();

    const inv = await runWithContext(ctxA, async () => {
      const cust = await db.customer.create({
        data: {
          tenantId: tenantA,
          name: "ISO Cust A",
          contactPerson: "",
          tin: "",
          phone: "",
          email: "",
          city: "",
          address: "",
          paymentTerms: "",
        },
      });
      return db.invoice.create({
        data: {
          tenantId: tenantA,
          number: `ISO-${stamp}`,
          customerId: cust.id,
          customerName: cust.name,
          issueDate: new Date(),
          dueDate: new Date(),
          subtotal: 100,
          discount: 0,
          vatAmount: 18,
          total: 118,
          status: "Draft",
          efdNumber: `EFD-ISO-${stamp}`,
          notes: "",
          lines: {
            create: [
              { tenantId: tenantA, description: "x", quantity: 1, unitPrice: 100, discountPct: 0, vatPct: 18, lineTotal: 100 },
            ],
          },
        },
        include: { lines: true },
      });
    });
    expect(inv.lines).toHaveLength(1);

    // Tenant B sees none of A's invoices
    const bInvoices = await runWithContext(ctxB, async () => db.invoice.findMany());
    expect(bInvoices.find((i) => i.id === inv.id)).toBeUndefined();

    // Malicious where.tenantId = B is overridden for tenant A
    const aMalicious = await runWithContext(ctxA, async () =>
      db.invoice.findMany({ where: { tenantId: tenantB } }),
    );
    expect(aMalicious.every((i) => i.tenantId === tenantA)).toBe(true);
  }, 60_000);

  it("isolates quotations (with nested lines) across tenants", async () => {
    const ctxA = { tenantId: tenantA, userId: "u_a", role: "CFO" as const };
    const ctxB = { tenantId: tenantB, userId: "u_b", role: "CFO" as const };
    const stamp = Date.now();

    const quo = await runWithContext(ctxA, async () => {
      const cust = await db.customer.create({
        data: { tenantId: tenantA, name: "Quo Cust A", contactPerson: "", tin: "", phone: "", email: "", city: "", address: "", paymentTerms: "" },
      });
      return db.quotation.create({
        data: {
          tenantId: tenantA,
          number: `QUO-ISO-${stamp}`,
          customerId: cust.id,
          customerName: cust.name,
          date: new Date(),
          validUntil: new Date(),
          subtotal: 100,
          vatAmount: 18,
          total: 118,
          status: "Draft",
          lines: { create: [{ tenantId: tenantA, description: "x", quantity: 1, unitPrice: 100, discountPct: 0, vatPct: 18, lineTotal: 100 }] },
        },
        include: { lines: true },
      });
    });
    expect(quo.lines).toHaveLength(1);

    const bQuotes = await runWithContext(ctxB, async () => db.quotation.findMany());
    expect(bQuotes.find((q) => q.id === quo.id)).toBeUndefined();

    const aMalicious = await runWithContext(ctxA, async () =>
      db.quotation.findMany({ where: { tenantId: tenantB } }),
    );
    expect(aMalicious.every((q) => q.tenantId === tenantA)).toBe(true);
  }, 60_000);

  it("isolates suppliers + purchase orders (with nested lines) across tenants", async () => {
    const ctxA = { tenantId: tenantA, userId: "u_a", role: "CFO" as const };
    const ctxB = { tenantId: tenantB, userId: "u_b", role: "CFO" as const };
    const stamp = Date.now();

    const po = await runWithContext(ctxA, async () => {
      const sup = await db.supplier.create({
        data: { tenantId: tenantA, name: "Sup A", contactPerson: "", tin: "", phone: "", email: "", city: "", address: "", paymentTerms: "Net 30", bankName: "", bankAccount: "" },
      });
      return db.purchaseOrder.create({
        data: {
          tenantId: tenantA,
          number: `PO-ISO-${stamp}`,
          supplierId: sup.id,
          supplierName: sup.name,
          date: new Date(),
          expectedDelivery: new Date(),
          subtotal: 100,
          vatAmount: 18,
          total: 118,
          status: "Draft",
          lines: { create: [{ tenantId: tenantA, description: "x", quantity: 1, unitPrice: 100, lineTotal: 100 }] },
        },
        include: { lines: true },
      });
    });
    expect(po.lines).toHaveLength(1);

    const bSuppliers = await runWithContext(ctxB, async () => db.supplier.findMany());
    expect(bSuppliers.find((s) => s.name === "Sup A")).toBeUndefined();
    const bPOs = await runWithContext(ctxB, async () => db.purchaseOrder.findMany());
    expect(bPOs.find((p) => p.id === po.id)).toBeUndefined();

    const aMalicious = await runWithContext(ctxA, async () =>
      db.purchaseOrder.findMany({ where: { tenantId: tenantB } }),
    );
    expect(aMalicious.every((p) => p.tenantId === tenantA)).toBe(true);
  }, 60_000);

  it("isolates tax filings + VAT returns (with nested transactions) across tenants", async () => {
    const ctxA = { tenantId: tenantA, userId: "u_a", role: "CFO" as const };
    const ctxB = { tenantId: tenantB, userId: "u_b", role: "CFO" as const };
    const stamp = Date.now();

    const vat = await runWithContext(ctxA, async () => {
      await db.taxFiling.create({
        data: { tenantId: tenantA, type: "VAT", period: `ISO ${stamp}`, dueDate: new Date(), amount: 100, status: "Pending" },
      });
      return db.vATReturn.create({
        data: {
          tenantId: tenantA,
          period: `ISO-VAT-${stamp}`,
          outputVAT: 100,
          inputVAT: 20,
          vatPayable: 80,
          transactions: { create: [{ tenantId: tenantA, direction: "Output", date: new Date(), reference: "R1", description: "x", netAmount: 556, vatRate: 18, vatAmount: 100 }] },
        },
        include: { transactions: true },
      });
    });
    expect(vat.transactions).toHaveLength(1);

    const bFilings = await runWithContext(ctxB, async () => db.taxFiling.findMany());
    expect(bFilings.find((f) => f.period === `ISO ${stamp}`)).toBeUndefined();
    const bReturns = await runWithContext(ctxB, async () => db.vATReturn.findMany());
    expect(bReturns.find((r) => r.id === vat.id)).toBeUndefined();

    const aMalicious = await runWithContext(ctxA, async () =>
      db.taxFiling.findMany({ where: { tenantId: tenantB } }),
    );
    expect(aMalicious.every((f) => f.tenantId === tenantA)).toBe(true);
  }, 60_000);

  it("isolates leads, pipeline deals, and budget lines across tenants", async () => {
    const ctxA = { tenantId: tenantA, userId: "u_a", role: "CFO" as const };
    const ctxB = { tenantId: tenantB, userId: "u_b", role: "CFO" as const };
    const stamp = Date.now();

    await runWithContext(ctxA, async () => {
      await db.lead.create({
        data: { tenantId: tenantA, name: `Lead A ${stamp}`, company: "Co A", phone: "", email: "", source: "Web", status: "New", temperature: "Warm", assignedTo: "", expectedValue: 1000 },
      });
      await db.pipelineDeal.create({
        data: { tenantId: tenantA, dealName: `Deal A ${stamp}`, companyName: "Co A", contactName: "", value: 5000, probability: 10, stage: "Lead", assignedTo: "", assignedInitials: "", daysInStage: 0, notes: "" },
      });
      await db.budgetLine.create({
        data: { tenantId: tenantA, lineItem: `Line A ${stamp}`, category: "Ops", annualBudget: 1200, mtdBudget: 100, mtdActual: 100, mtdVariance: 0, ytdBudget: 1000, ytdActual: 1000, ytdVariance: 0 },
      });
    });

    const bLeads = await runWithContext(ctxB, async () => db.lead.findMany());
    expect(bLeads.find((l) => l.name === `Lead A ${stamp}`)).toBeUndefined();
    const bDeals = await runWithContext(ctxB, async () => db.pipelineDeal.findMany());
    expect(bDeals.find((d) => d.dealName === `Deal A ${stamp}`)).toBeUndefined();
    const bBudgets = await runWithContext(ctxB, async () => db.budgetLine.findMany());
    expect(bBudgets.find((x) => x.lineItem === `Line A ${stamp}`)).toBeUndefined();

    const aMalicious = await runWithContext(ctxA, async () =>
      db.lead.findMany({ where: { tenantId: tenantB } }),
    );
    expect(aMalicious.every((l) => l.tenantId === tenantA)).toBe(true);
  }, 60_000);
});

describe.skipIf(!RUN)("audit step results (real DB)", () => {
  let db: Db;
  let authDb: AuthDb;
  let runWithContext: RunWithContext;
  let tenantId = "";
  let engagementId = "";

  beforeAll(async () => {
    ({ db } = await import("@/lib/server/db"));
    ({ authDb } = await import("@/lib/server/auth-db"));
    ({ runWithContext } = await import("@/lib/server/request-context"));
    const stamp = Date.now();
    const t = await authDb.tenant.create({ data: { name: "ISO AUDIT", slug: `iso-audit-${stamp}` } });
    tenantId = t.id;
    const eng = await authDb.auditEngagement.create({
      data: { tenantId, name: "ISO Engagement", period: "FY", auditorName: "Tester" },
    });
    engagementId = eng.id;
  }, 60_000);

  afterAll(async () => {
    if (authDb && tenantId) {
      await authDb.auditStepResult.deleteMany({ where: { tenantId } });
      await authDb.auditEngagement.deleteMany({ where: { tenantId } });
      await authDb.tenant.deleteMany({ where: { id: tenantId } });
      await authDb.$disconnect();
    }
  }, 60_000);

  it("upserts a step result by (tenant, procedure, stepKey), updates in place, resets, isolates", async () => {
    const ctx = { tenantId, userId: "test", role: "CFO" as const };

    // Insert
    await runWithContext(ctx, async () =>
      db.auditStepResult.upsert({
        where: { tenantId_procedure_stepKey: { tenantId, procedure: "Expenses", stepKey: "exp_capture" } },
        update: { status: "Passed", notes: "first" },
        create: { tenantId, engagementId, procedure: "Expenses", stepKey: "exp_capture", status: "Passed", notes: "first" },
      }),
    );
    let rows = await authDb.auditStepResult.findMany({ where: { tenantId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("Passed");

    // Upsert the same key → updates in place (no second row)
    await runWithContext(ctx, async () =>
      db.auditStepResult.upsert({
        where: { tenantId_procedure_stepKey: { tenantId, procedure: "Expenses", stepKey: "exp_capture" } },
        update: { status: "Exception", notes: "second" },
        create: { tenantId, engagementId, procedure: "Expenses", stepKey: "exp_capture", status: "Exception", notes: "second" },
      }),
    );
    rows = await authDb.auditStepResult.findMany({ where: { tenantId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("Exception");
    expect(rows[0]?.notes).toBe("second");

    // Reset deletes the procedure's results
    await runWithContext(ctx, async () => db.auditStepResult.deleteMany({ where: { procedure: "Expenses" } }));
    rows = await authDb.auditStepResult.findMany({ where: { tenantId } });
    expect(rows).toHaveLength(0);

    // Malicious cross-tenant read returns nothing from another tenant
    const malicious = await runWithContext(ctx, async () =>
      db.auditStepResult.findMany({ where: { tenantId: "some-other-tenant" } }),
    );
    expect(malicious.every((r) => r.tenantId === tenantId)).toBe(true);
  }, 60_000);
});

describe.skipIf(!RUN)("compound journal posting (real DB)", () => {
  let db: Db;
  let authDb: AuthDb;
  let runWithContext: RunWithContext;
  let tenantId = "";
  const ref = `TEST-JV-${Date.now()}`;

  beforeAll(async () => {
    ({ db } = await import("@/lib/server/db"));
    ({ authDb } = await import("@/lib/server/auth-db"));
    ({ runWithContext } = await import("@/lib/server/request-context"));
    // Self-contained: the app tenant carries no seeded bank account, so create a scratch
    // tenant that owns ba_001 (the id bankIdForAccountCode("1010") resolves to).
    const stamp = Date.now();
    const t = await authDb.tenant.create({ data: { name: "ISO JV", slug: `iso-jv-${stamp}` } });
    tenantId = t.id;
    await authDb.bankAccount.create({
      data: {
        id: "ba_001",
        tenantId,
        bankName: "CRDB",
        accountName: "CRDB Operating",
        accountNumber: "0000",
        currency: "TZS",
        balance: 0,
      },
    });
  }, 60_000);

  afterAll(async () => {
    if (authDb && tenantId) {
      await authDb.bankTransaction.deleteMany({ where: { tenantId } });
      await authDb.gLEntry.deleteMany({ where: { tenantId } });
      await authDb.journalEntryGroup.deleteMany({ where: { tenantId } });
      await authDb.bankAccount.deleteMany({ where: { tenantId } });
      await authDb.tenant.deleteMany({ where: { id: tenantId } });
      await authDb.$disconnect();
    }
  }, 60_000);

  it("posts a balanced entry on account 1010 → bank txn + balance move; reverse restores", async () => {
    expect(tenantId).not.toBe("");
    const ctx = { tenantId, userId: "test", role: "CFO" as const };
    const amount = 1_234_567;

    const before = await authDb.bankAccount.findFirst({ where: { id: "ba_001", tenantId } });
    expect(before).not.toBeNull();
    const beforeBal = Number(before?.balance ?? 0);

    await runWithContext(ctx, async () =>
      db.$transaction((tx) =>
        applyJournalEntry(tx, tenantId, ctx, {
          reference: ref,
          narration: "ISO compound test",
          date: new Date().toISOString().split("T")[0]!,
          lines: [
            { accountCode: "1010", accountName: "CRDB Operating", debit: amount, credit: 0 },
            { accountCode: "4000", accountName: "Sales Revenue", debit: 0, credit: amount },
          ],
        }),
      ),
    );

    const bankTx = await authDb.bankTransaction.findFirst({ where: { tenantId, reference: ref } });
    expect(bankTx).not.toBeNull();
    expect(Number(bankTx?.credit ?? 0)).toBe(amount); // journal debit → bank credit (money in)
    const after = await authDb.bankAccount.findFirst({ where: { id: "ba_001", tenantId } });
    expect(Number(after?.balance ?? 0)).toBe(beforeBal + amount);

    // Reverse restores balance and removes the bank txn + GL rows
    await runWithContext(ctx, async () =>
      db.$transaction((tx) => reverseJournalEntry(tx, tenantId, ref)),
    );
    const restored = await authDb.bankAccount.findFirst({ where: { id: "ba_001", tenantId } });
    expect(Number(restored?.balance ?? 0)).toBe(beforeBal);
    const goneTx = await authDb.bankTransaction.findFirst({ where: { tenantId, reference: ref } });
    expect(goneTx).toBeNull();
  }, 60_000);
});

describe.skipIf(!RUN)("inventory compound (real DB)", () => {
  let db: Db;
  let authDb: AuthDb;
  let runWithContext: RunWithContext;
  let tenantId = "";
  let itemId = "";

  beforeAll(async () => {
    ({ db } = await import("@/lib/server/db"));
    ({ authDb } = await import("@/lib/server/auth-db"));
    ({ runWithContext } = await import("@/lib/server/request-context"));
    const stamp = Date.now();
    const t = await authDb.tenant.create({ data: { name: "ISO INV", slug: `iso-inv-${stamp}` } });
    tenantId = t.id;
    const item = await authDb.inventoryItem.create({
      data: {
        tenantId,
        code: `ISO-ITM-${stamp}`,
        name: "ISO Widget",
        category: "Test",
        unit: "Each",
        onHand: 10,
        reorderLevel: 5,
        unitCost: 100,
        sellingPrice: 150,
        totalValue: 1000,
        location: "Test",
        supplier: "Test",
        costingMethod: "WeightedAverage",
        status: "InStock",
      },
    });
    itemId = item.id;
  }, 60_000);

  afterAll(async () => {
    if (authDb && tenantId) {
      await authDb.stockMovement.deleteMany({ where: { tenantId } });
      await authDb.inventoryItem.deleteMany({ where: { tenantId } });
      await authDb.tenant.deleteMany({ where: { id: tenantId } });
      await authDb.$disconnect();
    }
  }, 60_000);

  it("OUT decrements onHand, writes a signed movement, and flips status at thresholds", async () => {
    const ctx = { tenantId, userId: "test", role: "CFO" as const };

    // OUT 7 → 3 (< reorderLevel 5) → LowStock
    const r1 = await runWithContext(ctx, async () =>
      db.$transaction((tx) => applyStockMovement(tx, tenantId, { itemId, type: "OUT", quantity: 7, unitCost: 100 })),
    );
    expect(r1?.newOnHand).toBe(3);
    const item1 = await authDb.inventoryItem.findFirst({ where: { id: itemId, tenantId } });
    expect(Number(item1?.onHand ?? -1)).toBe(3);
    expect(item1?.status).toBe("LowStock");
    const mv = await authDb.stockMovement.findFirst({ where: { tenantId, itemId } });
    expect(Number(mv?.quantity ?? 0)).toBe(-7); // OUT stored signed-negative

    // OUT 3 more → 0 → OutOfStock
    await runWithContext(ctx, async () =>
      db.$transaction((tx) => applyStockMovement(tx, tenantId, { itemId, type: "OUT", quantity: 3, unitCost: 100 })),
    );
    const item2 = await authDb.inventoryItem.findFirst({ where: { id: itemId, tenantId } });
    expect(Number(item2?.onHand ?? -1)).toBe(0);
    expect(item2?.status).toBe("OutOfStock");
  }, 60_000);
});

describe.skipIf(!RUN)("payroll compound (real DB)", () => {
  let db: Db;
  let authDb: AuthDb;
  let runWithContext: RunWithContext;
  let tenantId = "";
  const gross = 1_500_000;

  beforeAll(async () => {
    ({ db } = await import("@/lib/server/db"));
    ({ authDb } = await import("@/lib/server/auth-db"));
    ({ runWithContext } = await import("@/lib/server/request-context"));
    const stamp = Date.now();
    const t = await authDb.tenant.create({ data: { name: "ISO PAY", slug: `iso-pay-${stamp}` } });
    tenantId = t.id;
    await authDb.employee.create({
      data: {
        tenantId,
        employeeNumber: `ISO-EMP-${stamp}`,
        firstName: "Iso",
        lastName: "Worker",
        fullName: "Iso Worker",
        department: "Finance",
        position: "Analyst",
        employmentType: "Permanent",
        startDate: new Date(),
        basicSalary: gross,
        housingAllowance: 0,
        transportAllowance: 0,
        otherAllowances: 0,
        grossSalary: gross,
        nssf: "",
        tin: "",
        bankName: "",
        bankAccount: "",
        phone: "",
        email: "",
        status: "Active",
        leaveBalance: 0,
        hasHeslb: false,
      },
    });
  }, 60_000);

  afterAll(async () => {
    if (authDb && tenantId) {
      await authDb.payrollRunEmployee.deleteMany({ where: { tenantId } });
      await authDb.payrollRun.deleteMany({ where: { tenantId } });
      await authDb.employeeAllowance.deleteMany({ where: { tenantId } });
      await authDb.employee.deleteMany({ where: { tenantId } });
      await authDb.tenant.deleteMany({ where: { id: tenantId } });
      await authDb.$disconnect();
    }
  }, 60_000);

  it("builds a payroll run with per-employee deductions matching the PAYE engine", async () => {
    const ctx = { tenantId, userId: "test", role: "CFO" as const };
    const result = await runWithContext(ctx, async () =>
      db.$transaction((tx) => buildPayrollRun(tx, tenantId, ctx, { year: 2024, month: 11, period: "ISO November 2024" })),
    );
    expect(result.employeeCount).toBe(1);

    const run = await authDb.payrollRun.findFirst({ where: { tenantId, period: "ISO November 2024" } });
    expect(run).not.toBeNull();
    expect(Number(run?.totalGross ?? 0)).toBe(gross);

    const line = await authDb.payrollRunEmployee.findFirst({ where: { tenantId } });
    const expected = calculateDeductions(gross, false);
    expect(Number(line?.paye ?? -1)).toBe(expected.paye);
    expect(Number(line?.netPay ?? -1)).toBe(expected.netPay);

    // Tenant B (the inventory scratch tenant is gone; use a fresh empty read) sees nothing here:
    // malicious cross-tenant read returns only this tenant's run.
    const malicious = await runWithContext(ctx, async () =>
      db.payrollRun.findMany({ where: { tenantId: "some-other-tenant" } }),
    );
    expect(malicious.every((r) => r.tenantId === tenantId)).toBe(true);
  }, 60_000);
});

describe.skipIf(!RUN)("asset disposal compound (real DB)", () => {
  let db: Db;
  let authDb: AuthDb;
  let runWithContext: RunWithContext;
  let tenantId = "";
  let assetId = "";
  let code = "";

  beforeAll(async () => {
    ({ db } = await import("@/lib/server/db"));
    ({ authDb } = await import("@/lib/server/auth-db"));
    ({ runWithContext } = await import("@/lib/server/request-context"));
    const stamp = Date.now();
    const t = await authDb.tenant.create({ data: { name: "ISO FA", slug: `iso-fa-${stamp}` } });
    tenantId = t.id;
    code = `ISO-ASSET-${stamp}`;
    const asset = await authDb.fixedAsset.create({
      data: {
        tenantId,
        code,
        name: "ISO Asset",
        category: "Equipment",
        location: "Test",
        acquisitionDate: new Date(),
        cost: 100_000_000,
        residualValue: 0,
        usefulLifeYears: 5,
        depreciationMethod: "StraightLine",
        accumulatedDepreciation: 60_000_000,
        netBookValue: 40_000_000,
        status: "Active",
      },
    });
    assetId = asset.id;
  }, 60_000);

  afterAll(async () => {
    if (authDb && tenantId) {
      await authDb.gLEntry.deleteMany({ where: { tenantId } });
      await authDb.journalEntryGroup.deleteMany({ where: { tenantId } });
      await authDb.fixedAsset.deleteMany({ where: { tenantId } });
      await authDb.tenant.deleteMany({ where: { id: tenantId } });
      await authDb.$disconnect();
    }
  }, 60_000);

  it("disposes an asset → marks Disposed + posts a balanced GL journal", async () => {
    const ctx = { tenantId, userId: "test", role: "CFO" as const };
    const today = new Date().toISOString().split("T")[0]!;

    const result = await runWithContext(ctx, async () =>
      db.$transaction((tx) => applyAssetDisposal(tx, tenantId, ctx, { assetId, proceeds: 50_000_000, date: today })),
    );
    // NBV = 100M − 60M = 40M; gain = 50M − 40M = 10M
    expect(result?.gainLoss).toBe(10_000_000);

    const asset = await authDb.fixedAsset.findFirst({ where: { id: assetId, tenantId } });
    expect(asset?.status).toBe("Disposed");
    expect(Number(asset?.gainLoss ?? -1)).toBe(10_000_000);
    expect(Number(asset?.netBookValue ?? -1)).toBe(0);

    const group = await authDb.journalEntryGroup.findFirst({ where: { tenantId, reference: `FA-DISP-${code}` } });
    expect(group).not.toBeNull();

    const glRows = await authDb.gLEntry.findMany({ where: { tenantId, reference: `FA-DISP-${code}` } });
    const totalDebit = glRows.reduce((s, r) => s + Number(r.debit), 0);
    const totalCredit = glRows.reduce((s, r) => s + Number(r.credit), 0);
    expect(totalDebit).toBe(totalCredit); // balanced
    expect(totalDebit).toBe(110_000_000); // 50M bank + 60M accDep = 100M cost + 10M gain

    // Tenant B sees no assets
    const ctxB = { tenantId: "some-other-tenant", userId: "u_b", role: "CFO" as const };
    const bAssets = await runWithContext(ctxB, async () => db.fixedAsset.findMany({ where: { tenantId } }));
    expect(bAssets.length).toBe(0);
  }, 60_000);
});
