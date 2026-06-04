/**
 * The tenant-scoping policy, factored out of the Prisma client extension so it
 * can be unit-tested with no PrismaClient and no database. `lib/server/db.ts`
 * calls `applyTenantScope` from inside its `$allOperations` hook.
 *
 * The contract: for every tenant-scoped model, the current tenant's id is
 * injected into the `where` clause (reads + targeted writes/deletes) and into
 * the `data`/`create` payload (writes). The injected `tenantId` is always
 * written LAST so a maliciously-supplied `tenantId` in the caller's args is
 * overridden — the extension wins.
 */

// Models the extension scopes by tenant. Auth.js tables (User, Account, Session,
// VerificationToken) and the tenancy roots (Tenant, Membership) are intentionally
// absent — they are written by the Auth.js adapter's raw, unscoped client.
export const TENANT_SCOPED_MODELS = [
  "Department",
  "COAAccount",
  "JournalEntryGroup",
  "GLEntry",
  "BankAccount",
  "BankTransaction",
  "Customer",
  "Invoice",
  "InvoiceLine",
  "Quotation",
  "QuotationLine",
  "SendLogEntry",
  "Lead",
  "PipelineDeal",
  "InventoryItem",
  "StockMovement",
  "Supplier",
  "PurchaseOrder",
  "POLine",
  "Employee",
  "EmployeeAllowance",
  "PayrollRun",
  "PayrollRunEmployee",
  "TaxFiling",
  "VATReturn",
  "VATTransaction",
  "FixedAsset",
  "BudgetLine",
  "AuditEngagement",
  "AuditStepResult",
  "AuditLog",
  "CompanyProfile",
  "Document",
] as const;

export type TenantScopedModel = (typeof TENANT_SCOPED_MODELS)[number];

const TENANT_SCOPED_SET: ReadonlySet<string> = new Set(TENANT_SCOPED_MODELS);

export function isTenantScopedModel(model: string | undefined): model is TenantScopedModel {
  return model !== undefined && TENANT_SCOPED_SET.has(model);
}

// Operations whose `where` clause must be tenant-scoped (reads + filtered writes/deletes).
const WHERE_OPERATIONS: ReadonlySet<string> = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "delete",
  "deleteMany",
]);

type Row = Record<string, unknown>;

/** The subset of Prisma operation args this policy reads/mutates. */
export interface ScopableArgs {
  where?: Row;
  data?: Row | Row[];
  create?: Row;
}

/**
 * Mutates `args` in place to bind it to `tenantId`, and returns the same object
 * for convenience. No-op for models outside {@link TENANT_SCOPED_MODELS}.
 */
export function applyTenantScope(
  model: string | undefined,
  operation: string,
  args: ScopableArgs,
  tenantId: string,
): ScopableArgs {
  if (!isTenantScopedModel(model)) return args;

  if (WHERE_OPERATIONS.has(operation)) {
    args.where = { ...(args.where ?? {}), tenantId };
    return args;
  }

  switch (operation) {
    case "create": {
      const data = (args.data ?? {}) as Row;
      args.data = { ...data, tenantId };
      break;
    }
    case "createMany":
    case "createManyAndReturn": {
      const rows = Array.isArray(args.data) ? args.data : args.data ? [args.data] : [];
      args.data = rows.map((row) => ({ ...row, tenantId }));
      break;
    }
    case "upsert": {
      args.where = { ...(args.where ?? {}), tenantId };
      args.create = { ...(args.create ?? {}), tenantId };
      break;
    }
    default:
      break;
  }

  return args;
}
