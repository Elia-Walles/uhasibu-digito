import "server-only";
import { authDb } from "@/lib/server/auth-db";

// In-app notification creation. Uses the unscoped client (notifications are user-targeted, not
// tenant-scoped) so it works from any context — tenant actions, admin actions, and cron. Best-effort:
// a failed notification never breaks the payment flow it accompanies. Email dispatch stays with the
// callers (each event knows its own branded template + recipient).
export type NotificationType = "info" | "success" | "warning" | "error" | "payment";

export interface NotifyInput {
  type?: NotificationType;
  title: string;
  body: string;
  link?: string;
  tenantId?: string;
}

export async function notifyUser(userId: string, n: NotifyInput): Promise<void> {
  try {
    await authDb.notification.create({
      data: {
        userId,
        type: n.type ?? "info",
        title: n.title,
        body: n.body,
        ...(n.link ? { link: n.link } : {}),
        ...(n.tenantId ? { tenantId: n.tenantId } : {}),
      },
    });
  } catch (e) {
    console.error("[notify] failed to create notification:", e);
  }
}

export async function notifyUsers(userIds: string[], n: NotifyInput): Promise<void> {
  await Promise.all(userIds.map((id) => notifyUser(id, n)));
}

/** Notify a tenant's owner (earliest Admin user). Returns the owner (for a follow-up email). */
export async function notifyTenantOwner(tenantId: string, n: NotifyInput): Promise<{ id: string; email: string } | null> {
  const owner = await authDb.user.findFirst({
    where: { tenantId, role: "Admin" },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });
  if (!owner) return null;
  await notifyUser(owner.id, { ...n, tenantId });
  return { id: owner.id, email: owner.email ?? "" };
}

/** Notify every platform super-admin. Returns them (for follow-up emails). */
export async function notifySuperAdmins(n: NotifyInput): Promise<{ id: string; email: string }[]> {
  const admins = await authDb.user.findMany({ where: { isSuperAdmin: true }, select: { id: true, email: true } });
  await notifyUsers(admins.map((a) => a.id), n);
  return admins.map((a) => ({ id: a.id, email: a.email ?? "" }));
}
