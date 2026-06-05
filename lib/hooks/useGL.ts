"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listGLEntries,
  postJournalEntry as postAction,
  editJournalEntry as editAction,
} from "@/lib/server/actions/ledger";
import { type Result } from "@/lib/server/result";
import type { GLEntry, JournalEntryLine } from "@/types";

export interface JournalPayload {
  reference: string;
  narration: string;
  date: string;
  lines: JournalEntryLine[];
}

export interface UseGL {
  glEntries: GLEntry[];
  loading: boolean;
  postJournalEntry: (p: JournalPayload) => Promise<Result<{ reference: string }>>;
  editJournalEntry: (p: JournalPayload) => Promise<Result<{ reference: string }>>;
}

export function useGL(): UseGL {
  const [serverGL, setServerGL] = useState<GLEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setServerGL(await listGLEntries());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount
    void refresh();
  }, [refresh]);

  return {
    glEntries: serverGL,
    loading,
    postJournalEntry: async (p) => {
      const r = await postAction(p);
      if (r.ok) await refresh();
      return r;
    },
    editJournalEntry: async (p) => {
      const r = await editAction(p);
      if (r.ok) await refresh();
      return r;
    },
  };
}
