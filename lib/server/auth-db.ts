import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

/**
 * The raw, UNSCOPED Prisma client — the single documented exception to
 * "lib/server/db.ts is the only client". Used by the Auth.js PrismaAdapter,
 * credential lookup, and the registration action, all of which touch
 * User/Tenant/Account/Session/VerificationToken BEFORE a tenant is bound and so
 * must not pass through the tenant-scoping extension. Domain Server Actions never
 * import this — they use the scoped `db`.
 */
const globalForAuthDb = globalThis as unknown as { __udAuthDb?: PrismaClient };

export const authDb =
  globalForAuthDb.__udAuthDb ??
  new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL ?? "") });

if (process.env.NODE_ENV !== "production") {
  globalForAuthDb.__udAuthDb = authDb;
}
