"use server";
import type { BankAccount as DbBankAccount, BankTransaction as DbBankTx } from "@prisma/client";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import { setMatchedSchema, reconcileSchema } from "@/lib/server/schemas/banking";
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
  return withAuth(async () => {
    const res = await db.bankTransaction.updateMany({
      where: { bankAccountId, matched: false },
      data: { matched: true },
    });
    return ok({ count: res.count });
  });
}
