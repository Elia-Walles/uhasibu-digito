import { describe, it, expect, vi, beforeEach } from "vitest";

// Proves two admin-lane guarantees with no DB:
//   (a) every read-only tenant drill-down passes an explicit where.tenantId to the
//       UNSCOPED adminDb (the scoping safety net does NOT apply on the admin lane), and
//   (b) withAdminAuth rejects any caller who is not a super-admin.

const h = vi.hoisted(() => ({
  session: { user: { id: "u1", email: "op@platform.tz", isSuperAdmin: true } } as
    | { user: { id: string; email: string; isSuperAdmin: boolean } }
    | null,
  calls: [] as { model: string; where: unknown }[],
}));

vi.mock("@/auth", () => ({ auth: () => Promise.resolve(h.session) }));

vi.mock("@/lib/server/admin-db", () => ({
  adminDb: new Proxy(
    {},
    {
      get: (_t, model: string) => ({
        findMany: (args: { where?: unknown }) => {
          h.calls.push({ model, where: args?.where });
          return Promise.resolve([]);
        },
      }),
    },
  ),
}));

import * as drilldown from "@/lib/server/actions/admin/drilldown";
import { withAdminAuth, NotSuperAdminError } from "@/lib/server/with-admin-auth";

const DRILLDOWNS = [
  drilldown.getTenantInvoices,
  drilldown.getTenantLedger,
  drilldown.getTenantPayroll,
  drilldown.getTenantInventory,
  drilldown.getTenantBanking,
  drilldown.getTenantPOS,
  drilldown.getTenantCustomers,
  drilldown.getTenantSuppliers,
  drilldown.getTenantTax,
  drilldown.getTenantFixedAssets,
];

describe("drill-down readers are tenant-bound", () => {
  beforeEach(() => {
    h.calls.length = 0;
    h.session = { user: { id: "u1", email: "op@platform.tz", isSuperAdmin: true } };
  });

  it("every reader passes where.tenantId to adminDb", async () => {
    for (const fn of DRILLDOWNS) {
      h.calls.length = 0;
      const res = await fn({ tenantId: "tenant_x" });
      expect(res.ok).toBe(true);
      expect(h.calls.length).toBeGreaterThan(0);
      for (const c of h.calls) {
        expect((c.where as { tenantId?: string }).tenantId).toBe("tenant_x");
      }
    }
  });

  it("rejects a missing tenantId before touching the DB", async () => {
    h.calls.length = 0;
    const res = await drilldown.getTenantInvoices({});
    expect(res.ok).toBe(false);
    expect(h.calls.length).toBe(0);
  });
});

describe("withAdminAuth guard", () => {
  it("rejects a non-super-admin session", async () => {
    h.session = { user: { id: "u2", email: "user@tenant.tz", isSuperAdmin: false } };
    await expect(withAdminAuth(async () => "ran")).rejects.toBeInstanceOf(NotSuperAdminError);
  });

  it("rejects an unauthenticated caller", async () => {
    h.session = null;
    await expect(withAdminAuth(async () => "ran")).rejects.toBeInstanceOf(NotSuperAdminError);
  });

  it("runs for a super-admin", async () => {
    h.session = { user: { id: "u1", email: "op@platform.tz", isSuperAdmin: true } };
    await expect(withAdminAuth(async () => "ran")).resolves.toBe("ran");
  });
});
