"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listStaff,
  inviteStaff as inviteAction,
  updateStaff as updateAction,
  setStaffDisabled as disableAction,
  resendStaffInvite as resendAction,
  type StaffMember,
} from "@/lib/server/actions/staff";
import type { Result } from "@/lib/server/result";
import type { UserRole } from "@/types";

export interface InviteStaffPayload {
  name: string;
  email: string;
  role: UserRole;
  branchId?: string;
}

export function useStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listStaff();
      if (res.ok) {
        setStaff(res.data);
        setForbidden(false);
      }
    } catch {
      setForbidden(true); // requireAdmin threw — not an admin
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  return {
    staff,
    loading,
    forbidden,
    refresh,
    invite: async (input: InviteStaffPayload): Promise<Result<{ devLink?: string }>> => {
      const r = await inviteAction(input);
      if (r.ok) await refresh();
      return r;
    },
    update: async (input: { id: string; role?: UserRole; branchId?: string }): Promise<Result<true>> => {
      const r = await updateAction(input);
      if (r.ok) await refresh();
      return r;
    },
    setDisabled: async (id: string, disabled: boolean): Promise<Result<true>> => {
      const r = await disableAction({ id, disabled });
      if (r.ok) await refresh();
      return r;
    },
    resend: async (id: string): Promise<Result<{ devLink?: string }>> => resendAction({ id }),
  };
}
