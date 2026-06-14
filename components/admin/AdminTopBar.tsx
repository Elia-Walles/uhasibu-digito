"use client";
import { Menu, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useCurrentUser, useSignOut } from "@/lib/auth/client";

export function AdminTopBar({ onMenu }: { onMenu: () => void }) {
  const user = useCurrentUser();
  const signOut = useSignOut();

  return (
    <header className="fixed top-0 right-0 left-0 md:left-[260px] z-20 h-16 bg-white/90 backdrop-blur-md border-b border-ud-border">
      <div className="flex items-center h-full px-4 md:px-6 gap-3">
        <button
          onClick={onMenu}
          className="md:hidden p-2 -ml-2 rounded-lg hover:bg-ud-surface-2"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-ud-text-secondary" />
        </button>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-ud-gold-50 text-ud-gold-dark text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-ud-gold animate-pulse-soft" />
          <span>Platform control room</span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-ud-text-primary leading-tight">{user?.name ?? "Operator"}</div>
            <div className="text-[11px] text-ud-text-muted tracking-[0.04em] uppercase">Super-admin</div>
          </div>
          <Avatar initials={user?.initials ?? "OP"} size="sm" variant="obsidian" />
          <button
            onClick={() => void signOut()}
            className="p-2 rounded-xl hover:bg-ud-surface-2 text-ud-text-secondary hover:text-ud-text-primary transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
