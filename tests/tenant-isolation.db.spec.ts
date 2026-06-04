import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { applyJournalEntry, reverseJournalEntry } from "@/lib/server/journal-posting";

// Real-DB tenant-isolation gate. Opt-in: runs only with RUN_DB_TESTS=1 against a
// scratch database (the Wave 0 unit suite stays the always-on gate). Modules are
// imported dynamically inside the suite so this file is import-safe when skipped —
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

    // B still sees its own — proving the delete above did not fall through
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
    const tenant = await authDb.tenant.findUnique({ where: { slug: "kilimanjaro" } });
    tenantId = tenant?.id ?? "";
  }, 60_000);

  afterAll(async () => {
    if (authDb && tenantId) {
      // Belt-and-braces: ensure the test entry leaves no residue.
      await authDb.bankTransaction.deleteMany({ where: { tenantId, reference: ref } });
      await authDb.gLEntry.deleteMany({ where: { tenantId, reference: ref } });
      await authDb.journalEntryGroup.deleteMany({ where: { tenantId, reference: ref } });
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
