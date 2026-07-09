"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type UINotification,
} from "@/lib/server/actions/notifications";

export function useNotifications() {
  const [notifications, setNotifications] = useState<UINotification[]>([]);

  const refresh = useCallback(async () => {
    try {
      setNotifications(await listNotifications());
    } catch {
      // best-effort — leave the last known list on a transient failure
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 60_000);
    return () => clearInterval(timer);
  }, [refresh]);

  const unread = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unread,
    refresh,
    markRead: async (id: string) => {
      setNotifications((xs) => xs.map((n) => (n.id === id ? { ...n, read: true } : n)));
      await markNotificationRead({ id });
    },
    markAllRead: async () => {
      setNotifications((xs) => xs.map((n) => ({ ...n, read: true })));
      await markAllNotificationsRead();
    },
  };
}

export type { UINotification };
