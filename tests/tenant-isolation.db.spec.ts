import { describe, it, expect, beforeAll, afterAll } from "vitest";

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
      await authDb.department.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
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
});
