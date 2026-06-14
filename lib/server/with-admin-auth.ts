import { auth } from "@/auth";

/** Thrown when a non-super-admin reaches an admin Server Action. */
export class NotSuperAdminError extends Error {
  constructor(message = "Forbidden: super-admin only") {
    super(message);
    this.name = "NotSuperAdminError";
  }
}

export interface AdminContext {
  userId: string;
  email: string;
}

/**
 * The seam every platform-admin Server Action runs inside. Reads the Auth.js session,
 * rejects anyone who is not a super-admin, then runs `fn` with the operator context.
 *
 * It deliberately does NOT call `runWithContext`, so the tenant-scoped `db`
 * (lib/server/db.ts) is unusable from inside an admin action any tenant-scoped query
 * there throws "No request context". This makes it impossible to accidentally perform a
 * tenant-scoped business write from the admin lane: admin actions use `adminDb` only.
 */
export async function withAdminAuth<T>(fn: (ctx: AdminContext) => Promise<T>): Promise<T> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || user.isSuperAdmin !== true) {
    throw new NotSuperAdminError();
  }
  return fn({ userId: user.id, email: user.email ?? "" });
}
