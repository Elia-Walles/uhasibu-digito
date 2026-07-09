"use server";
import { authDb } from "@/lib/server/auth-db";
import { withAuth } from "@/lib/server/with-auth";
import { ok, err, type Result } from "@/lib/server/result";
import { iso } from "@/lib/server/serialize";

export interface UINotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

/** The caller's latest notifications (queried by their own userId — notifications aren't tenant-scoped). */
export async function listNotifications(): Promise<UINotification[]> {
  return withAuth(async (ctx) => {
    const rows = await authDb.notification.findMany({ where: { userId: ctx.userId }, orderBy: { createdAt: "desc" }, take: 30 });
    return rows.map((r) => ({ id: r.id, type: r.type, title: r.title, body: r.body, link: r.link, read: r.read, createdAt: iso(r.createdAt) }));
  });
}

export async function unreadNotificationCount(): Promise<number> {
  return withAuth(async (ctx) => authDb.notification.count({ where: { userId: ctx.userId, read: false } }));
}

export async function markNotificationRead(input: unknown): Promise<Result<{ id: string }>> {
  const id = input && typeof input === "object" && "id" in input ? String((input as { id: unknown }).id) : "";
  if (!id) return err("Invalid notification id");
  return withAuth(async (ctx) => {
    await authDb.notification.updateMany({ where: { id, userId: ctx.userId }, data: { read: true } });
    return ok({ id });
  });
}

export async function markAllNotificationsRead(): Promise<Result<{ count: number }>> {
  return withAuth(async (ctx) => {
    const res = await authDb.notification.updateMany({ where: { userId: ctx.userId, read: false }, data: { read: true } });
    return ok({ count: res.count });
  });
}
