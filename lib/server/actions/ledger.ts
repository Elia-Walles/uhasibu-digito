"use server";
import type { COAAccount as DbCOA, GLEntry as DbGL } from "@prisma/client";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import { applyJournalEntry, reverseJournalEntry } from "@/lib/server/journal-posting";
import { postJournalSchema, editJournalSchema } from "@/lib/server/schemas/ledger";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum, dateOnly, iso } from "@/lib/server/serialize";
import type { COAAccount, GLEntry, AccountType, GLStatus } from "@/types";

function rowToCOA(r: DbCOA): COAAccount {
  return {
    code: r.code,
    name: r.name,
    type: r.type as AccountType,
    parentCode: r.parentCode,
    openingBalance: decToNum(r.openingBalance),
    movement: decToNum(r.movement),
    closingBalance: decToNum(r.closingBalance),
    level: r.level,
  };
}

function rowToGL(r: DbGL): GLEntry {
  return {
    id: r.id,
    date: dateOnly(r.date),
    reference: r.reference,
    narration: r.narration,
    account: r.account,
    accountCode: r.accountCode,
    costCentre: r.costCentre,
    debit: decToNum(r.debit),
    credit: decToNum(r.credit),
    balance: decToNum(r.balance),
    postedBy: r.postedBy,
    postedAt: iso(r.postedAt),
    status: r.status as GLStatus,
  };
}

export async function listCOAAccounts(): Promise<COAAccount[]> {
  return withAuth(async () => {
    const rows = await db.cOAAccount.findMany({ orderBy: { code: "asc" } });
    return rows.map(rowToCOA);
  });
}

export async function listGLEntries(): Promise<GLEntry[]> {
  return withAuth(async () => {
    const rows = await db.gLEntry.findMany({ orderBy: [{ date: "desc" }, { createdAt: "desc" }] });
    return rows.map(rowToGL);
  });
}

function validateBalanced(lines: { accountCode: string; debit: number; credit: number }[]): string | null {
  const valid = lines.filter((l) => l.accountCode && (l.debit > 0 || l.credit > 0));
  if (valid.length < 2) return "A journal needs at least 2 valid lines";
  const totalDebit = valid.reduce((s, l) => s + l.debit, 0);
  const totalCredit = valid.reduce((s, l) => s + l.credit, 0);
  if (totalDebit <= 0) return "Enter debit and credit amounts";
  if (Math.round(totalDebit) !== Math.round(totalCredit)) return "Debits must equal credits";
  return null;
}

export async function postJournalEntry(input: unknown): Promise<Result<{ reference: string }>> {
  const parsed = postJournalSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const p = parsed.data;
  const balanceError = validateBalanced(p.lines);
  if (balanceError) return err(balanceError);

  return withAuth(async (ctx) => {
    const existing = await db.journalEntryGroup.findFirst({ where: { reference: p.reference } });
    if (existing) return err(`Reference ${p.reference} already exists`);
    const lines = p.lines.filter((l) => l.accountCode && (l.debit > 0 || l.credit > 0));
    await db.$transaction((tx) => applyJournalEntry(tx, ctx.tenantId, ctx, { ...p, lines }));
    return ok({ reference: p.reference });
  });
}

export async function editJournalEntry(input: unknown): Promise<Result<{ reference: string }>> {
  const parsed = editJournalSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const p = parsed.data;
  const balanceError = validateBalanced(p.lines);
  if (balanceError) return err(balanceError);

  return withAuth(async (ctx) => {
    const lines = p.lines.filter((l) => l.accountCode && (l.debit > 0 || l.credit > 0));
    await db.$transaction(async (tx) => {
      await reverseJournalEntry(tx, ctx.tenantId, p.reference);
      await applyJournalEntry(tx, ctx.tenantId, ctx, { ...p, lines });
      await tx.auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userName: ctx.userId,
          action: "Modified",
          module: "General Ledger",
          recordRef: p.reference,
          ipAddress: "server",
          details: `Edited journal entry ${p.reference}`,
        },
      });
    });
    return ok({ reference: p.reference });
  });
}
