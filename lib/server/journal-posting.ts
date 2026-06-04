import type { db } from "./db";
import type { RequestContext } from "./request-context";
import { bankIdForAccountCode } from "@/lib/utils/bank-account-mapping";

// The interactive-transaction client for the extended `db` (no lifecycle methods).
type Tx = Omit<typeof db, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export interface JournalLineInput {
  accountCode: string;
  accountName: string;
  description?: string;
  debit: number;
  credit: number;
}

export interface JournalPayload {
  lines: JournalLineInput[];
  narration: string;
  reference: string;
  date: string; // YYYY-MM-DD
}

/**
 * The compound write: inside one transaction, create the JournalEntryGroup + GLEntry
 * rows, and for any line whose accountCode maps to a bank account, insert a matching
 * BankTransaction and move BankAccount.balance. Everything is scoped by tenantId
 * explicitly so it is correct regardless of whether the client extension fires inside
 * $transaction — and unit-testable with the raw tx client.
 */
export async function applyJournalEntry(
  tx: Tx,
  tenantId: string,
  ctx: RequestContext,
  payload: JournalPayload,
): Promise<{ groupId: string }> {
  const date = new Date(payload.date);
  const narration = payload.narration || `Journal ${payload.reference}`;

  const group = await tx.journalEntryGroup.create({
    data: {
      tenantId,
      reference: payload.reference,
      narration,
      status: "Posted",
      postedById: ctx.userId,
      postedAt: new Date(),
    },
  });

  for (const line of payload.lines) {
    await tx.gLEntry.create({
      data: {
        tenantId,
        groupId: group.id,
        date,
        reference: payload.reference,
        narration,
        account: line.accountName,
        accountCode: line.accountCode,
        costCentre: "HQ",
        debit: line.debit,
        credit: line.credit,
        balance: line.debit - line.credit,
        postedBy: ctx.userId,
        status: "Posted",
      },
    });

    const bankId = bankIdForAccountCode(line.accountCode);
    const delta = line.debit - line.credit;
    if (bankId && delta !== 0) {
      const acc = await tx.bankAccount.findFirst({ where: { id: bankId, tenantId } });
      if (acc) {
        const newBalance = Number(acc.balance) + delta;
        await tx.bankTransaction.create({
          data: {
            tenantId,
            bankAccountId: bankId,
            date,
            description: narration,
            debit: delta < 0 ? -delta : 0,
            credit: delta > 0 ? delta : 0,
            balance: newBalance,
            reference: payload.reference,
            matched: false,
          },
        });
        await tx.bankAccount.update({ where: { id: bankId }, data: { balance: newBalance } });
      }
    }
  }

  return { groupId: group.id };
}

/**
 * Undo a previously-posted entry: drop its GL rows + group, remove the bank
 * transactions it created (matched by reference), and back out their net effect on
 * each BankAccount.balance.
 */
export async function reverseJournalEntry(tx: Tx, tenantId: string, reference: string): Promise<void> {
  const bankTxns = await tx.bankTransaction.findMany({ where: { tenantId, reference } });
  const netByAccount = new Map<string, number>();
  for (const t of bankTxns) {
    const net = Number(t.credit) - Number(t.debit);
    netByAccount.set(t.bankAccountId, (netByAccount.get(t.bankAccountId) ?? 0) + net);
  }

  await tx.bankTransaction.deleteMany({ where: { tenantId, reference } });

  for (const [bankId, net] of netByAccount) {
    const acc = await tx.bankAccount.findFirst({ where: { id: bankId, tenantId } });
    if (acc) {
      await tx.bankAccount.update({ where: { id: bankId }, data: { balance: Number(acc.balance) - net } });
    }
  }

  await tx.gLEntry.deleteMany({ where: { tenantId, reference } });
  await tx.journalEntryGroup.deleteMany({ where: { tenantId, reference } });
}
