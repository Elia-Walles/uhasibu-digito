import type { db } from "./db";
import type { RequestContext } from "./request-context";
import { recordAudit, moduleForRef } from "./audit";

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

/** Thrown when a journal is dated inside a closed/locked accounting period. */
export class PostingLockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PostingLockError";
  }
}

/**
 * The compound write: inside one transaction, create the JournalEntryGroup + GLEntry
 * rows, and for any line whose accountCode maps to a bank account, insert a matching
 * BankTransaction and move BankAccount.balance. Everything is scoped by tenantId
 * explicitly so it is correct regardless of whether the client extension fires inside
 * $transaction and unit-testable with the raw tx client.
 */
export async function applyJournalEntry(
  tx: Tx,
  tenantId: string,
  ctx: RequestContext,
  payload: JournalPayload,
): Promise<{ groupId: string }> {
  const date = new Date(payload.date);
  const narration = payload.narration || `Journal ${payload.reference}`;

  // Posting lock: reject any entry dated on/before the books-locked-through date (closed period).
  const company = await tx.companyProfile.findFirst({ select: { booksLockedThrough: true } });
  if (company?.booksLockedThrough && date <= company.booksLockedThrough) {
    throw new PostingLockError(
      `The books are closed through ${company.booksLockedThrough.toISOString().split("T")[0]}. This entry falls in a locked period.`,
    );
  }

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

    // Bank mirror: if this line's COA code is linked to a BankAccount (via coaAccountCode),
    // move that account's balance and append a BankTransaction so Banking ⇄ GL stay in sync.
    const delta = line.debit - line.credit;
    if (delta !== 0) {
      const acc = await tx.bankAccount.findFirst({ where: { tenantId, coaAccountCode: line.accountCode } });
      if (acc) {
        const newBalance = Number(acc.balance) + delta;
        await tx.bankTransaction.create({
          data: {
            tenantId,
            bankAccountId: acc.id,
            date,
            description: narration,
            debit: delta < 0 ? -delta : 0,
            credit: delta > 0 ? delta : 0,
            balance: newBalance,
            reference: payload.reference,
            matched: false,
          },
        });
        await tx.bankAccount.update({ where: { id: acc.id }, data: { balance: newBalance } });
      }
    }
  }

  // Immutable audit trail — one entry per posted journal (covers every financial module).
  await recordAudit(tx, tenantId, ctx, {
    action: "Posted",
    module: moduleForRef(payload.reference),
    recordRef: payload.reference,
    details: narration,
  });

  return { groupId: group.id };
}

/**
 * Append-only reversal: instead of deleting the original, post a CONTRA entry (reference
 * `<ref>-REV`) with every debit/credit swapped, mark the original group `Reversed`, and back out
 * the bank mirror with an opposite BankTransaction. History is preserved; because reports sum all
 * GLEntry rows, the original + contra net to zero. Idempotent — only active `Posted` groups are
 * reversed. No ctx needed: the contra reuses the original's poster.
 */
export async function reverseJournalEntry(tx: Tx, tenantId: string, reference: string): Promise<void> {
  const revRef = `${reference}-REV`;
  const groups = await tx.journalEntryGroup.findMany({
    where: { tenantId, reference, status: "Posted" },
    include: { entries: true },
  });

  for (const g of groups) {
    const revGroup = await tx.journalEntryGroup.create({
      data: {
        tenantId,
        reference: revRef,
        narration: `Reversal of ${reference}`,
        status: "Posted",
        reversesRef: reference,
        postedById: g.postedById,
        postedAt: new Date(),
      },
    });
    for (const e of g.entries) {
      await tx.gLEntry.create({
        data: {
          tenantId,
          groupId: revGroup.id,
          date: e.date,
          reference: revRef,
          narration: `Reversal of ${reference}`,
          account: e.account,
          accountCode: e.accountCode,
          costCentre: e.costCentre,
          debit: e.credit, // swapped
          credit: e.debit,
          balance: Number(e.credit) - Number(e.debit),
          postedBy: e.postedBy,
          status: "Posted",
        },
      });
    }
    await tx.journalEntryGroup.update({ where: { id: g.id }, data: { status: "Reversed", reversedByRef: revRef } });
  }

  // Back out the bank mirror with contra transactions (append-only).
  const bankTxns = await tx.bankTransaction.findMany({ where: { tenantId, reference } });
  for (const bt of bankTxns) {
    const acc = await tx.bankAccount.findFirst({ where: { id: bt.bankAccountId, tenantId } });
    if (!acc) continue;
    const net = Number(bt.credit) - Number(bt.debit);
    const newBalance = Number(acc.balance) - net;
    await tx.bankTransaction.create({
      data: {
        tenantId,
        bankAccountId: bt.bankAccountId,
        date: bt.date,
        description: `Reversal of ${reference}`,
        debit: bt.credit, // swapped
        credit: bt.debit,
        balance: newBalance,
        reference: revRef,
        matched: false,
      },
    });
    await tx.bankAccount.update({ where: { id: acc.id }, data: { balance: newBalance } });
  }

  if (groups.length > 0) {
    await tx.auditLog.create({
      data: { tenantId, userName: "System", action: "Reversed", module: moduleForRef(reference), recordRef: reference, ipAddress: "server", details: `Reversed ${reference}` },
    });
  }
}
