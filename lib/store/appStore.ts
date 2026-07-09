import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppNotification, InvoiceStatus } from "@/types";
import type { Locale } from "@/lib/i18n/config";

export type EmailNotificationPrefs = Record<InvoiceStatus, boolean>;

const DEFAULT_EMAIL_PREFS: EmailNotificationPrefs = {
  Draft: false,
  Sent: true,
  Paid: true,
  Overdue: true,
  Cancelled: false,
};

interface AppState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  notifications: AppNotification[];
  emailNotifications: EmailNotificationPrefs;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  setSidebarOpen: (v: boolean) => void;
  toggleSidebar: () => void;
  toggleCollapse: () => void;
  addNotification: (n: AppNotification) => void;
  markRead: (id: string) => void;
  clearAll: () => void;
  setEmailNotification: (status: InvoiceStatus, enabled: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      sidebarCollapsed: false,
      // The bell now reads real server notifications (useNotifications); this local list is legacy
      // (still fed by a couple of client-side reminders) and starts empty — no mock seed data.
      notifications: [],
      emailNotifications: DEFAULT_EMAIL_PREFS,
      locale: "en",
      setLocale: (locale) => set({ locale }),
      setSidebarOpen: (v) => set({ sidebarOpen: v }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleCollapse: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      addNotification: (n) =>
        set((s) => ({ notifications: [n, ...s.notifications] })),
      markRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
      clearAll: () => set({ notifications: [] }),
      setEmailNotification: (status, enabled) =>
        set((s) => ({ emailNotifications: { ...s.emailNotifications, [status]: enabled } })),
    }),
    {
      name: "ud-app",
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        emailNotifications: s.emailNotifications,
        locale: s.locale,
      }),
    }
  )
);
