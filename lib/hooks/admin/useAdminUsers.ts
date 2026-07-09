"use client";
import { useCallback, useEffect, useState } from "react";
import { listUsers, updateUserRole, updateUser, setUserDisabled } from "@/lib/server/actions/admin/users";
import { grantSuperAdmin, revokeSuperAdmin } from "@/lib/server/actions/admin/admins";
import type { Result } from "@/lib/server/result";
import type { UserRole } from "@/types";
import type { AdminUserRow } from "@/lib/server/actions/admin/types";

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await listUsers());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  const wrap = async <T,>(p: Promise<Result<T>>): Promise<Result<T>> => {
    const res = await p;
    if (res.ok) await refresh();
    return res;
  };

  return {
    users,
    loading,
    refresh,
    changeRole: (userId: string, role: UserRole) => wrap(updateUserRole({ userId, role })),
    grant: (userId: string) => wrap(grantSuperAdmin({ userId })),
    revoke: (userId: string) => wrap(revokeSuperAdmin({ userId })),
    editUser: (userId: string, name?: string, email?: string) => wrap(updateUser({ userId, name, email })),
    setDisabled: (userId: string, disabled: boolean) => wrap(setUserDisabled({ userId, disabled })),
  };
}
