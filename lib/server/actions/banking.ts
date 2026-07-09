"use server";
import type { BankAccount as DbBankAccount, BankTransaction as DbBankTx } from "@prisma/client";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import { canManageBanking } from "@/lib/auth/roles";
import { applyJournalEntry } from "@/lib/server/journal-posting";
import { ensureCoaAccount } from "@/lib/server/gl-postings";
import { setMatchedSchema, reconcileSchema, createBankAccountSchema, addStatementLineSchema, importStatementLinesSchema, revalueFxSchema } from "@/lib/server/schemas/banking";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum, dateOnly } from "@/lib/server/serialize";
import type { BankAccount, BankTransaction, BankCurrency } from "@/types";

function rowToTx(t: DbBankTx): BankTransaction {
  return {
    id: t.id,
    date: dateOnly(t.date),
    description: t.description,
    debit: decToNum(t.debit),
    credit: decToNum(t.credit),
    balance: decToNum(t.balance),
    reference: t.reference,
    matched: t.matched,
  };
}

function rowToBank(a: DbBankAccount & { transactions: DbBankTx[] }): BankAccount {
  return {
    id: a.id,
    bankName: a.bankName,
    accountName: a.accountName,
    accountNumber: a.accountNumber,
    currency: a.currency as BankCurrency,
    balance: decToNum(a.balance),
    coaAccountCode: a.coaAccountCode ?? "",
    ...(a.balanceUSD !== null ? { balanceUSD: decToNum(a.balanceUSD) } : {}),
    transactions: a.transactions.map(rowToTx),
  };
}

export async function listBankAccounts(): Promise<BankAccount[]> {
  return withAuth(async () => {
    const rows = await db.bankAccount.findMany({
      orderBy: { id: "asc" },
      include: { transactions: { orderBy: { date: "desc" } } },
    });
    return rows.map(rowToBank);
  });
}

export async function setTransactionMatched(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = setMatchedSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, matched } = parsed.data;
  return withAuth(async () => {
    try {
      await db.bankTransaction.update({ where: { id }, data: { matched } });
      return ok({ id });
    } catch {
      return err("Transaction not found");
    }
  });
}

export async function markAccountReconciled(input: unknown): Promise<Result<{ count: number }>> {
  const parsed = reconcileSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { bankAccountId } = parsed.data;
  return withAuth(async (ctx) => {
    if (!canManageBanking(ctx.role)) return err("Your role can't reconcile accounts");
    const res = await db.bankTransaction.updateMany({
      where: { bankAccountId, matched: false },
      data: { matched: true },
    });
    return ok({ count: res.count });
  });
}

/**
 * Creates a bank account linked to a GL cash/bank account (coaAccountCode). If an opening balance
 * is given, posts an opening journal (Dr the GL account / Cr Opening Balance Equity 3900) which,
 * through the bank mirror, sets the account's balance — so GL and bank balance start reconciled.
 */
export async function createBankAccount(input: unknown): Promise<Result<BankAccount>> {
  const parsed = createBankAccountSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  return withAuth(async (ctx) => {
    if (!canManageBanking(ctx.role)) return err("Your role can't manage bank accounts");
    const isForeign = d.currency !== "TZS";
    // The GL is always kept in TZS: a foreign opening balance is converted at the entered rate,
    // while the account's own-currency balance is tracked in balanceUSD.
    const tzsOpening = Math.round(d.openingBalance * d.exchangeRate * 100) / 100;
    const created = await db.$transaction(async (tx) => {
      const acc = await tx.bankAccount.create({
        data: {
          tenantId: ctx.tenantId,
          bankName: d.bankName,
          accountName: d.accountName,
          accountNumber: d.accountNumber,
          currency: d.currency,
          coaAccountCode: d.coaAccountCode,
          balance: 0,
          ...(isForeign ? { balanceUSD: d.openingBalance } : {}),
        },
      });
      if (tzsOpening !== 0) {
        await ensureCoaAccount(tx, ctx.tenantId, "3900", "Opening Balance Equity", "Equity", "3000", 1);
        const amt = Math.abs(tzsOpening);
        const bankLine = { accountCode: d.coaAccountCode, accountName: d.bankName };
        const equityLine = { accountCode: "3900", accountName: "Opening Balance Equity" };
        const lines = tzsOpening > 0
          ? [{ ...bankLine, debit: amt, credit: 0 }, { ...equityLine, debit: 0, credit: amt }]
          : [{ ...equityLine, debit: amt, credit: 0 }, { ...bankLine, debit: 0, credit: amt }];
        await applyJournalEntry(tx, ctx.tenantId, ctx, {
          lines,
          narration: isForeign ? `Opening balance · ${d.bankName} (${d.openingBalance} ${d.currency} @ ${d.exchangeRate})` : `Opening balance · ${d.bankName}`,
          reference: `BANK-OPEN-${acc.id.slice(-8)}`,
          date: dateOnly(new Date()),
        });
      }
      return tx.bankAccount.findFirstOrThrow({ where: { id: acc.id }, include: { transactions: { orderBy: { date: "desc" } } } });
    });
    return ok(rowToBank(created));
  });
}

/**
 * Period-end revaluation of a foreign-currency account: re-prices its own-currency balance at the
 * closing rate and posts the unrealized FX difference (Dr/Cr the linked GL account vs FX Gain 4300 /
 * FX Loss 6600). The bank mirror moves the account's TZS carrying value to the revalued amount.
 */
export async function revalueForeignBalances(input: unknown): Promise<Result<{ delta: number }>> {
  const parsed = revalueFxSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  return withAuth(async (ctx) => {
    if (!canManageBanking(ctx.role)) return err("Your role can't revalue balances");
    const acc = await db.bankAccount.findFirst({ where: { id: d.bankAccountId } });
    if (!acc) return err("Bank account not found");
    if (acc.currency === "TZS") return err("Revaluation only applies to foreign-currency accounts");
    if (acc.balanceUSD === null) return err("This account has no foreign-currency balance to revalue");
    if (!acc.coaAccountCode) return err("Link this account to a GL cash/bank account first");

    const carrying = decToNum(acc.balance);
    const revalued = Math.round(decToNum(acc.balanceUSD) * d.rate * 100) / 100;
    const delta = Math.round((revalued - carrying) * 100) / 100;
    if (Math.abs(delta) < 0.01) return ok({ delta: 0 });

    await db.$transaction(async (tx) => {
      const gl = delta > 0
        ? { code: "4300", name: "Foreign Exchange Gain", type: "Income" as const, parent: "4000" }
        : { code: "6600", name: "Foreign Exchange Loss", type: "Expense" as const, parent: "6000" };
      await ensureCoaAccount(tx, ctx.tenantId, gl.code, gl.name, gl.type, gl.parent, 1);
      const amt = Math.abs(delta);
      const bankLine = { accountCode: acc.coaAccountCode!, accountName: acc.bankName };
      const glLine = { accountCode: gl.code, accountName: gl.name };
      const lines = delta > 0
        ? [{ ...bankLine, debit: amt, credit: 0 }, { ...glLine, debit: 0, credit: amt }]
        : [{ ...glLine, debit: amt, credit: 0 }, { ...bankLine, debit: 0, credit: amt }];
      await applyJournalEntry(tx, ctx.tenantId, ctx, {
        lines,
        narration: `FX revaluation · ${acc.bankName} @ ${d.rate}`,
        reference: `FX-REVAL-${acc.id.slice(-8)}-${Date.now().toString(36)}`,
        date: dateOnly(new Date()),
      });
    });
    return ok({ delta });
  });
}

export interface StatementLine {
  id: string;
  date: string;
  description: string;
  amount: number;
  reference: string;
  matched: boolean;
}

export async function listStatementLines(bankAccountId: string): Promise<StatementLine[]> {
  return withAuth(async () => {
    const rows = await db.bankStatementLine.findMany({ where: { bankAccountId }, orderBy: { date: "desc" } });
    return rows.map((r) => ({ id: r.id, date: dateOnly(r.date), description: r.description, amount: decToNum(r.amount), reference: r.reference, matched: r.matched }));
  });
}

/**
 * Adds a bank-statement line and auto-matches it to an unmatched GL-mirrored BankTransaction
 * with the same signed amount. Reconciliation = matched statement lines vs GL bank transactions.
 */
export async function addStatementLine(input: unknown): Promise<Result<{ id: string; matched: boolean }>> {
  const parsed = addStatementLineSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  return withAuth(async (ctx) => {
    const txns = await db.bankTransaction.findMany({ where: { bankAccountId: d.bankAccountId, matched: false } });
    const target = txns.find((t) => Math.abs(decToNum(t.credit) - decToNum(t.debit) - d.amount) < 0.01);
    const line = await db.$transaction(async (tx) => {
      const created = await tx.bankStatementLine.create({
        data: {
          tenantId: ctx.tenantId,
          bankAccountId: d.bankAccountId,
          date: new Date(d.date),
          description: d.description,
          amount: d.amount,
          reference: d.reference,
          ...(target ? { matched: true, matchedTxnId: target.id } : {}),
        },
      });
      if (target) await tx.bankTransaction.update({ where: { id: target.id }, data: { matched: true } });
      return created;
    });
    return ok({ id: line.id, matched: !!target });
  });
}

/**
 * Bulk-import parsed bank-statement lines (from a CSV) and auto-match each to an unmatched
 * GL-mirrored BankTransaction by signed amount, consuming each ledger transaction at most once.
 */
export async function importStatementLines(input: unknown): Promise<Result<{ imported: number; matched: number }>> {
  const parsed = importStatementLinesSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  return withAuth(async (ctx) => {
    if (!canManageBanking(ctx.role)) return err("Your role can't import statements");
    const txns = await db.bankTransaction.findMany({ where: { bankAccountId: d.bankAccountId, matched: false } });
    const used = new Set<string>();
    let imported = 0;
    let matched = 0;
    for (const l of d.lines) {
      const target = txns.find((tn) => !used.has(tn.id) && Math.abs(decToNum(tn.credit) - decToNum(tn.debit) - l.amount) < 0.01);
      await db.$transaction(async (tx) => {
        await tx.bankStatementLine.create({
          data: {
            tenantId: ctx.tenantId,
            bankAccountId: d.bankAccountId,
            date: new Date(l.date),
            description: l.description,
            amount: l.amount,
            reference: l.reference,
            ...(target ? { matched: true, matchedTxnId: target.id } : {}),
          },
        });
        if (target) await tx.bankTransaction.update({ where: { id: target.id }, data: { matched: true } });
      });
      imported += 1;
      if (target) { used.add(target.id); matched += 1; }
    }
    return ok({ imported, matched });
  });
}
