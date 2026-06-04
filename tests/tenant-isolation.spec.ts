import { describe, it, expect } from "vitest";
import {
  applyTenantScope,
  isTenantScopedModel,
  TENANT_SCOPED_MODELS,
  type ScopableArgs,
} from "@/lib/server/tenant-scope";
import { currentContext, runWithContext } from "@/lib/server/request-context";

// The non-negotiable tenant-isolation gate. It proves the scoping policy that
// lib/server/db.ts applies inside its Prisma `$allOperations` hook, with no
// PrismaClient and no database. CI fails if this suite fails.

const TENANT_A = "tenant_a";
const TENANT_B = "tenant_b";

describe("TENANT_SCOPED_MODELS allowlist", () => {
  it("scopes finance + sales + compliance models", () => {
    for (const model of ["Invoice", "GLEntry", "BankTransaction", "Employee", "Customer", "AuditLog"]) {
      expect(isTenantScopedModel(model)).toBe(true);
    }
  });

  it("never scopes Auth.js / tenancy-root models", () => {
    for (const model of ["User", "Account", "Session", "VerificationToken", "Tenant", "Membership"]) {
      expect(isTenantScopedModel(model)).toBe(false);
      expect((TENANT_SCOPED_MODELS as readonly string[]).includes(model)).toBe(false);
    }
  });

  it("treats unknown / undefined models as not scoped", () => {
    expect(isTenantScopedModel(undefined)).toBe(false);
    expect(isTenantScopedModel("NotAModel")).toBe(false);
  });
});

describe("read scoping", () => {
  const readOps = [
    "findUnique",
    "findFirst",
    "findMany",
    "count",
    "aggregate",
    "groupBy",
    "update",
    "updateMany",
    "delete",
    "deleteMany",
  ];

  it("injects tenantId into where for every read/filtered op", () => {
    for (const op of readOps) {
      const args: ScopableArgs = { where: { status: "Sent" } };
      applyTenantScope("Invoice", op, args, TENANT_A);
      expect(args.where).toEqual({ status: "Sent", tenantId: TENANT_A });
    }
  });

  it("injects tenantId when no where is supplied", () => {
    const args: ScopableArgs = {};
    applyTenantScope("Invoice", "findMany", args, TENANT_A);
    expect(args.where).toEqual({ tenantId: TENANT_A });
  });

  it("OVERRIDES a maliciously-supplied where.tenantId (extension wins)", () => {
    const args: ScopableArgs = { where: { tenantId: TENANT_B, id: "inv_1" } };
    applyTenantScope("Invoice", "findMany", args, TENANT_A);
    expect(args.where?.tenantId).toBe(TENANT_A);
  });
});

describe("write scoping", () => {
  it("injects tenantId into create data", () => {
    const args: ScopableArgs = { data: { number: "INV-1" } };
    applyTenantScope("Invoice", "create", args, TENANT_A);
    expect(args.data).toEqual({ number: "INV-1", tenantId: TENANT_A });
  });

  it("OVERRIDES a maliciously-supplied create data.tenantId", () => {
    const args: ScopableArgs = { data: { number: "INV-1", tenantId: TENANT_B } };
    applyTenantScope("Invoice", "create", args, TENANT_A);
    expect((args.data as Record<string, unknown>).tenantId).toBe(TENANT_A);
  });

  it("maps tenantId onto every row of createMany", () => {
    const args: ScopableArgs = {
      data: [
        { number: "INV-1" },
        { number: "INV-2", tenantId: TENANT_B },
      ],
    };
    applyTenantScope("Invoice", "createMany", args, TENANT_A);
    expect(args.data).toEqual([
      { number: "INV-1", tenantId: TENANT_A },
      { number: "INV-2", tenantId: TENANT_A },
    ]);
  });

  it("scopes both where and create for upsert", () => {
    const args: ScopableArgs = {
      where: { id: "inv_1", tenantId: TENANT_B },
      create: { number: "INV-1", tenantId: TENANT_B },
    };
    applyTenantScope("Invoice", "upsert", args, TENANT_A);
    expect(args.where?.tenantId).toBe(TENANT_A);
    expect(args.create?.tenantId).toBe(TENANT_A);
  });
});

describe("non-scoped models pass through untouched", () => {
  it("does not inject tenantId on a User read", () => {
    const args: ScopableArgs = { where: { email: "a@b.com" } };
    applyTenantScope("User", "findMany", args, TENANT_A);
    expect(args.where).toEqual({ email: "a@b.com" });
    expect(args.where?.tenantId).toBeUndefined();
  });

  it("does not inject tenantId on a Session create", () => {
    const args: ScopableArgs = { data: { sessionToken: "tok" } };
    applyTenantScope("Session", "create", args, TENANT_A);
    expect(args.data).toEqual({ sessionToken: "tok" });
  });
});

describe("request context", () => {
  it("throws when read outside an authenticated handler", () => {
    expect(() => currentContext()).toThrow(/No request context/);
  });

  it("provides the bound context inside runWithContext", () => {
    const result = runWithContext(
      { tenantId: TENANT_A, userId: "usr_1", role: "CFO" },
      () => currentContext(),
    );
    expect(result).toEqual({ tenantId: TENANT_A, userId: "usr_1", role: "CFO" });
  });

  it("isolates context between two tenants", () => {
    const a = runWithContext({ tenantId: TENANT_A, userId: "usr_a", role: "CFO" }, () => currentContext().tenantId);
    const b = runWithContext({ tenantId: TENANT_B, userId: "usr_b", role: "Accountant" }, () => currentContext().tenantId);
    expect(a).toBe(TENANT_A);
    expect(b).toBe(TENANT_B);
    expect(a).not.toBe(b);
  });
});
