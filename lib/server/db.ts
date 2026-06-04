import { PrismaClient } from "@prisma/client";
import { createMariaDbAdapter } from "./db-adapter";
import { currentContext } from "./request-context";
import { applyTenantScope, isTenantScopedModel, type ScopableArgs } from "./tenant-scope";

/**
 * The ONE Prisma client for the whole application. Every Server Action and Route
 * Handler imports `db` from here. It is tenant-scoped: the `$allOperations` hook
 * injects the caller's `tenantId` into every query for a tenant-scoped model
 * (see lib/server/tenant-scope.ts). There is intentionally no other PrismaClient
 * in the project except the raw, unscoped client the Auth.js PrismaAdapter uses
 * for its own tables (User/Account/Session/VerificationToken) — those are written
 * before a tenant is bound, so they must not be scoped.
 *
 * Prisma 7 connects through a driver adapter; the connection string comes from
 * DATABASE_URL. The mariadb adapter speaks the MySQL wire protocol, which TiDB
 * Cloud is compatible with. The pool connects lazily on first query.
 */
function createExtendedClient() {
  // Raise the interactive-transaction timeout: the compound writes (journal posting,
  // stock movement, payroll run with N employees) do many round-trips, and remote TiDB
  // latency can blow past Prisma's 5s default. maxWait covers pool-acquisition under load.
  const base = new PrismaClient({
    adapter: createMariaDbAdapter(),
    transactionOptions: { timeout: 30_000, maxWait: 15_000 },
  });

  return base.$extends({
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          if (!isTenantScopedModel(model)) return query(args);
          const { tenantId } = currentContext();
          applyTenantScope(model, operation, args as ScopableArgs, tenantId);
          return query(args);
        },
      },
    },
  });
}

type ExtendedClient = ReturnType<typeof createExtendedClient>;

const globalForPrisma = globalThis as unknown as { __udPrisma?: ExtendedClient };

export const db: ExtendedClient = globalForPrisma.__udPrisma ?? createExtendedClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__udPrisma = db;
}
