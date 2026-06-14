import { PrismaClient } from "@prisma/client";
import { createMariaDbAdapter } from "./db-adapter";

/**
 * The platform admin's UNSCOPED Prisma client the second documented exception to
 * "lib/server/db.ts is the only client" (the first being lib/server/auth-db.ts).
 *
 * It carries NO tenant-scoping extension, so it can read/write across every tenant.
 * It is reached ONLY through `withAdminAuth` (lib/server/with-admin-auth.ts), which
 * verifies the caller is a super-admin. Domain Server Actions never import this.
 *
 * Read discipline for tenant-scoped business models: drill-down readers MUST pass an
 * explicit `where: { tenantId }` (validated by zod) and use read operations only 
 * the scoping safety net does NOT apply here, so a missing filter would leak data.
 */
const globalForAdminDb = globalThis as unknown as { __udAdminDb?: PrismaClient };

export const adminDb =
  globalForAdminDb.__udAdminDb ?? new PrismaClient({ adapter: createMariaDbAdapter() });

if (process.env.NODE_ENV !== "production") {
  globalForAdminDb.__udAdminDb = adminDb;
}
