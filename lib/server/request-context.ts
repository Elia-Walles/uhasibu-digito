import { AsyncLocalStorage } from "node:async_hooks";
import type { UserRole } from "@/types";

/**
 * Per-request tenant/user context, populated by the auth wrapper before any
 * Server Action or Route Handler runs, and read by the Prisma client extension
 * in `lib/server/db.ts` to scope every query to the caller's tenant.
 */
export interface RequestContext {
  tenantId: string;
  userId: string;
  role: UserRole;
}

// Cache the AsyncLocalStorage on globalThis so HMR (dev/Turbopack) can't create a second
// instance: if `withAuth` set the store on one instance while the Prisma extension in
// lib/server/db.ts read another, every scoped query would throw "No request context".
// Same singleton pattern as the PrismaClient cache in lib/server/db.ts.
const globalForCtx = globalThis as unknown as { __udRequestContext?: AsyncLocalStorage<RequestContext> };

export const requestContext: AsyncLocalStorage<RequestContext> =
  globalForCtx.__udRequestContext ?? new AsyncLocalStorage<RequestContext>();

if (process.env.NODE_ENV !== "production") {
  globalForCtx.__udRequestContext = requestContext;
}

/**
 * Returns the active request context, throwing if called outside an
 * authenticated handler. The throw is deliberate: it means a tenant-scoped
 * query was attempted with no tenant bound, which must fail loudly rather than
 * leak across tenants.
 */
export function currentContext(): RequestContext {
  const ctx = requestContext.getStore();
  if (!ctx) {
    throw new Error(
      "No request context must be called inside an authenticated handler (withAuth / runWithContext).",
    );
  }
  return ctx;
}

/** Run `fn` with the given context bound (the low-level seam under withAuth). */
export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return requestContext.run(ctx, fn);
}
