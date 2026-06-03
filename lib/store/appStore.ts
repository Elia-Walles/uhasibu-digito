import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppNotification, InvoiceStatus } from "@/types";

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
      notifications: [
        {
          id: "n1",
          type: "warning",
          title: "VAT return due",
          message: "October 2024 VAT return is due in 4 days",
          timestamp: new Date().toISOString(),
          read: false,
          link: "/tax/vat-returns",
        },
        {
          id: "n2",
          type: "info",
          title: "Payroll ready",
          message: "October payroll is ready to review",
          timestamp: new Date().toISOString(),
          read: false,
          link: "/payroll/run-payroll",
        },
        {
          id: "n3",
          type: "error",
          title: "Low stock alerts",
          message: "12 items below reorder level",
          timestamp: new Date().toISOString(),
          read: false,
          link: "/inventory/items",
        },
      ],
      emailNotifications: DEFAULT_EMAIL_PREFS,
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
      }),
    }
  )
);
