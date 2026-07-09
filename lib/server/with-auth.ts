import { auth } from "@/auth";
import { runWithContext, type RequestContext } from "./request-context";
import { isBranchRestricted } from "@/lib/auth/roles";

export class UnauthenticatedError extends Error {
  constructor(message = "Unauthenticated") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Throws unless the acting user is the tenant owner/admin. Use to gate staff/settings management. */
export function requireAdmin(ctx: RequestContext): void {
  if (ctx.role !== "Admin") throw new ForbiddenError("Admins only");
}

/**
 * The branch a query/write must be limited to for the acting user: the user's own branch when they
 * are branch-restricted (Branch Manager / Cashier), otherwise `null` = no restriction (owner + finance
 * roles see every branch).
 */
export function branchScope(ctx: RequestContext): string | null {
  return isBranchRestricted(ctx.role) ? (ctx.branchId ?? null) : null;
}

/**
 * The seam every domain Server Action runs inside. Reads the Auth.js session,
 * rejects if there is no bound tenant, then runs `fn` with the tenant context set
 * so the scoped `db` (lib/server/db.ts) injects the right tenantId on every query.
 */
export async function withAuth<T>(fn: (ctx: RequestContext) => Promise<T>): Promise<T> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.tenantId) {
    throw new UnauthenticatedError();
  }
  const ctx: RequestContext = {
    tenantId: user.tenantId,
    userId: user.id,
    role: user.role,
    branchId: user.branchId ?? null,
    userName: user.name ?? "",
  };
  return runWithContext(ctx, () => fn(ctx));
}
