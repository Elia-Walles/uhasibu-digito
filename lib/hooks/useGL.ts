"use client";
import { useCallback, useEffect, useState } from "react";
import { LEDGER_BACKEND_ENABLED } from "@/lib/flags";
import { useDataStore } from "@/lib/store/dataStore";
import {
  listGLEntries,
  postJournalEntry as postAction,
  editJournalEntry as editAction,
} from "@/lib/server/actions/ledger";
import { ok, type Result } from "@/lib/server/result";
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
  const mockGL = useDataStore((s) => s.glEntries);
  const mockAdd = useDataStore((s) => s.addJournalEntry);
  const mockEdit = useDataStore((s) => s.editJournalEntry);

  const [serverGL, setServerGL] = useState<GLEntry[]>([]);
  const [loading, setLoading] = useState(LEDGER_BACKEND_ENABLED);

  const refresh = useCallback(async () => {
    if (!LEDGER_BACKEND_ENABLED) return;
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

  if (!LEDGER_BACKEND_ENABLED) {
    return {
      glEntries: mockGL,
      loading: false,
      postJournalEntry: async (p) => {
        mockAdd(p.lines, p.narration, p.reference);
        return ok({ reference: p.reference });
      },
      editJournalEntry: async (p) => {
        mockEdit(p.reference, p.lines, p.narration);
        return ok({ reference: p.reference });
      },
    };
  }

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
