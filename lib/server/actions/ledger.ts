"use server";
import type { COAAccount as DbCOA, GLEntry as DbGL } from "@prisma/client";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import { canPostFinancials } from "@/lib/auth/roles";
import { applyJournalEntry, reverseJournalEntry, PostingLockError } from "@/lib/server/journal-posting";
import { fiscalYearBounds } from "@/lib/server/fiscal";
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

/**
 * Chart of accounts with balances DERIVED LIVE from the general ledger (GLEntry) — the source
 * of truth — rather than the static seeded columns. Per account: opening = cumulative signed
 * movement before this fiscal year, movement = signed movement within the year, closing =
 * opening + movement. Parent/header accounts roll up their descendants.
 */
export async function getChartOfAccounts(): Promise<COAAccount[]> {
  return withAuth(async () => {
    const company = await db.companyProfile.findFirst({ select: { fiscalYearStartMonth: true } });
    const { fyStart } = fiscalYearBounds(new Date(), company?.fiscalYearStartMonth ?? 1);
    const accounts = await db.cOAAccount.findMany({ orderBy: { code: "asc" } });
    const typeByCode = new Map(accounts.map((a) => [a.code, a.type]));
    // Two windowed DB aggregations (before FY = opening, within FY = movement) instead of a
    // full-table scan aggregated in JS.
    const [openRows, moveRows] = await Promise.all([
      db.gLEntry.groupBy({ by: ["accountCode"], where: { date: { lt: fyStart } }, _sum: { debit: true, credit: true } }),
      db.gLEntry.groupBy({ by: ["accountCode"], where: { date: { gte: fyStart } }, _sum: { debit: true, credit: true } }),
    ]);
    const signedOf = (code: string, sum: { debit: unknown; credit: unknown }) => {
      const type = typeByCode.get(code);
      const debitNormal = type === "Asset" || type === "Expense" || type === "CostOfSales";
      const d = decToNum((sum.debit ?? 0) as number);
      const c = decToNum((sum.credit ?? 0) as number);
      return debitNormal ? d - c : c - d;
    };
    const openOwn = new Map<string, number>();
    const moveOwn = new Map<string, number>();
    for (const r of openRows) openOwn.set(r.accountCode, signedOf(r.accountCode, r._sum));
    for (const r of moveRows) moveOwn.set(r.accountCode, signedOf(r.accountCode, r._sum));

    const childrenOf = new Map<string, string[]>();
    for (const a of accounts) {
      if (!a.parentCode) continue;
      const list = childrenOf.get(a.parentCode) ?? [];
      list.push(a.code);
      childrenOf.set(a.parentCode, list);
    }
    const rollup = (code: string, own: Map<string, number>, memo: Map<string, number>): number => {
      const cached = memo.get(code);
      if (cached !== undefined) return cached;
      let total = own.get(code) ?? 0;
      for (const child of childrenOf.get(code) ?? []) total += rollup(child, own, memo);
      memo.set(code, total);
      return total;
    };
    const openMemo = new Map<string, number>();
    const moveMemo = new Map<string, number>();

    return accounts.map((a) => {
      const opening = rollup(a.code, openOwn, openMemo);
      const movement = rollup(a.code, moveOwn, moveMemo);
      return {
        code: a.code,
        name: a.name,
        type: a.type as AccountType,
        parentCode: a.parentCode,
        openingBalance: opening,
        movement,
        closingBalance: opening + movement,
        level: a.level,
      };
    });
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
    if (!canPostFinancials(ctx.role)) return err("Your role can't post to the general ledger");
    const existing = await db.journalEntryGroup.findFirst({ where: { reference: p.reference, status: "Posted" } });
    if (existing) return err(`Reference ${p.reference} already exists`);
    const lines = p.lines.filter((l) => l.accountCode && (l.debit > 0 || l.credit > 0));
    try {
      await db.$transaction((tx) => applyJournalEntry(tx, ctx.tenantId, ctx, { ...p, lines }));
    } catch (e) {
      if (e instanceof PostingLockError) return err(e.message);
      throw e;
    }
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
    if (!canPostFinancials(ctx.role)) return err("Your role can't edit ledger entries");
    const lines = p.lines.filter((l) => l.accountCode && (l.debit > 0 || l.credit > 0));
    try {
    await db.$transaction(async (tx) => {
      // Append-only: reverse (posts a contra + audits "Reversed") then repost (audits "Posted").
      await reverseJournalEntry(tx, ctx.tenantId, p.reference);
      await applyJournalEntry(tx, ctx.tenantId, ctx, { ...p, lines });
    });
    } catch (e) {
      if (e instanceof PostingLockError) return err(e.message);
      throw e;
    }
    return ok({ reference: p.reference });
  });
}
