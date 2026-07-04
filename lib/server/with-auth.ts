import { auth } from "@/auth";
import { runWithContext, type RequestContext } from "./request-context";

export class UnauthenticatedError extends Error {
  constructor(message = "Unauthenticated") {
    super(message);
    this.name = "UnauthenticatedError";
  }
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
    userName: user.name ?? "",
  };
  return runWithContext(ctx, () => fn(ctx));
}
