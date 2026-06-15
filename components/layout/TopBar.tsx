"use client";
import { useState } from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Menu, Search, Bell, ChevronDown, LogOut, User as UserIcon, Settings as SettingsIcon } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useCurrentUser, useSignOut } from "@/lib/auth/client";
import { useAppStore } from "@/lib/store/appStore";
import { useRouter } from "next/navigation";
import { formatTZS } from "@/lib/utils/currency";
import { useCompany } from "@/lib/hooks/useCompany";
import { useT } from "@/lib/hooks/useT";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { cn } from "@/lib/utils/cn";

export function TopBar() {
  const router = useRouter();
  const user = useCurrentUser();
  const signOut = useSignOut();
  const { company } = useCompany();
  const t = useT();
  const { toggleSidebar, notifications, sidebarCollapsed } = useAppStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header
      className={cn(
        "fixed top-0 right-0 left-0 z-20 h-16 bg-white/90 backdrop-blur-md border-b border-ud-border transition-[left] duration-200",
        sidebarCollapsed ? "md:left-[68px]" : "md:left-[260px]",
      )}
    >
      <div className="flex items-center h-full px-4 md:px-6 gap-3">
        {/* Mobile menu */}
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 -ml-2 rounded-lg hover:bg-ud-surface-2"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-ud-text-secondary" />
        </button>

        {/* Search (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-ud-surface-2 text-sm text-ud-text-muted min-w-[280px] cursor-pointer hover:bg-ud-primary-50 transition-colors">
          <Search className="w-4 h-4" />
          <span>{t("Search anything…")}</span>
          <kbd className="ml-auto px-1.5 py-0.5 rounded bg-white border border-ud-border text-[10px] font-mono">⌘K</kbd>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Cash position pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-ud-primary-50 text-ud-primary text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-ud-primary-glow animate-pulse-soft" />
            <span>{t("Cash:")} <span className="font-mono tabular-nums">{formatTZS(312_800_000, true)}</span></span>
          </div>

          {/* Language */}
          <LanguageSwitcher />

          {/* Notifications */}
          <DropdownMenu.Root open={showNotifications} onOpenChange={setShowNotifications}>
            <DropdownMenu.Trigger asChild>
              <button
                className="relative p-2 rounded-xl hover:bg-ud-surface-2 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-ud-text-secondary" />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-ud-danger ring-2 ring-white" />
                )}
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={8}
                className="z-50 w-[min(20rem,calc(100vw-2rem))] bg-white rounded-2xl shadow-elevated border border-ud-border overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-ud-border flex items-center justify-between">
                  <span className="font-display font-bold text-sm">{t("Notifications")}</span>
                  {unread > 0 && (
                    <span className="text-xs bg-ud-danger/10 text-ud-danger px-2 py-0.5 rounded-full font-medium">{t("{n} new", { n: unread })}</span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-ud-text-muted">{t("No notifications")}</div>
                  ) : (
                    notifications.map((n) => (
                      <Link
                        key={n.id}
                        href={n.link ?? "#"}
                        className="block px-4 py-3 hover:bg-ud-surface-2 border-b border-ud-border last:border-b-0"
                      >
                        <div className="flex items-start gap-2">
                          <span className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                            n.type === "error" ? "bg-ud-danger" :
                            n.type === "warning" ? "bg-ud-warning" :
                            n.type === "success" ? "bg-ud-success" : "bg-ud-info")} />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-ud-text-primary truncate">{n.title}</div>
                            <div className="text-xs text-ud-text-muted truncate">{n.message}</div>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {/* Company pill (md+) */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-ud-surface-2 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-ud-success" />
            <span className="text-ud-text-secondary truncate max-w-[160px]">{company?.shortName || company?.name || ""}</span>
          </div>

          {/* User menu */}
          {user && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="flex items-center gap-2 p-1 rounded-xl hover:bg-ud-surface-2 transition-colors">
                  <Avatar initials={user.initials} size="sm" />
                  <div className="hidden md:flex flex-col items-start">
                    <span className="text-xs font-semibold text-ud-text-primary leading-tight">{user.name}</span>
                    <span className="text-[10px] text-ud-text-muted leading-tight">{user.role}</span>
                  </div>
                  <ChevronDown className="hidden md:block w-3 h-3 text-ud-text-muted" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" sideOffset={8} className="z-50 min-w-48 bg-white rounded-xl shadow-elevated border border-ud-border p-1">
                  <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-ud-surface-2 cursor-pointer outline-none">
                    <UserIcon className="w-3.5 h-3.5" />
                    {t("Profile")}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-ud-surface-2 cursor-pointer outline-none"
                    onSelect={() => router.push("/settings/company")}
                  >
                    <SettingsIcon className="w-3.5 h-3.5" />
                    {t("Settings")}
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="my-1 h-px bg-ud-border" />
                  <DropdownMenu.Item
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-ud-danger-bg text-ud-danger cursor-pointer outline-none"
                    onSelect={() => {
                      void signOut();
                    }}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    {t("Sign out")}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
        </div>
      </div>
    </header>
  );
}
