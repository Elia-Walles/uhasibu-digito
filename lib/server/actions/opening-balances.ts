"use server";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import { canClosePeriod } from "@/lib/auth/roles";
import { applyJournalEntry, reverseJournalEntry } from "@/lib/server/journal-posting";
import { ensureCoaAccount } from "@/lib/server/gl-postings";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum } from "@/lib/server/serialize";

const OPENING_REF = "OPENING";

const openingBalancesSchema = z.object({
  asAtDate: z.string().min(1), // YYYY-MM-DD
  lines: z.array(z.object({ accountCode: z.string().min(1), amount: z.number() })).min(1, "Enter at least one opening balance"),
});

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function isDebitNormal(type: string): boolean {
  return type === "Asset" || type === "Expense" || type === "CostOfSales";
}

/** The current (active) opening balances per account, in natural sign, for prefilling the form. */
export async function getOpeningBalances(): Promise<{ asAtDate: string | null; balances: { accountCode: string; amount: number }[] }> {
  return withAuth(async () => {
    const grp = await db.journalEntryGroup.findFirst({
      where: { reference: OPENING_REF, status: "Posted" },
      orderBy: { createdAt: "desc" },
      include: { entries: true },
    });
    if (!grp) return { asAtDate: null, balances: [] };
    const coa = await db.cOAAccount.findMany({ select: { code: true, type: true } });
    const typeByCode = new Map(coa.map((a) => [a.code, a.type]));
    const balances = grp.entries
      .filter((e) => e.accountCode !== "3900")
      .map((e) => {
        const debitNormal = isDebitNormal(typeByCode.get(e.accountCode) ?? "Asset");
        const amount = debitNormal ? decToNum(e.debit) - decToNum(e.credit) : decToNum(e.credit) - decToNum(e.debit);
        return { accountCode: e.accountCode, amount: round2(amount) };
      });
    return { asAtDate: grp.entries[0] ? grp.entries[0].date.toISOString().split("T")[0]! : null, balances };
  });
}

/**
 * Posts (or re-posts) the opening-balances journal. Each line's amount is in the account's natural
 * direction (assets/expenses +debit, liabilities/equity/income +credit); the balancing figure goes
 * to Opening Balance Equity (3900). Re-posting reverses the prior OPENING journal first.
 */
export async function postOpeningBalances(input: unknown): Promise<Result<{ reference: string; plug: number }>> {
  const parsed = openingBalancesSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  return withAuth(async (ctx) => {
    if (!canClosePeriod(ctx.role)) return err("Only senior finance roles can set opening balances");
    const coa = await db.cOAAccount.findMany({ select: { code: true, name: true, type: true } });
    const byCode = new Map(coa.map((a) => [a.code, a]));

    const lines: { accountCode: string; accountName: string; debit: number; credit: number }[] = [];
    let netDebit = 0;
    for (const l of d.lines) {
      if (l.amount === 0) continue;
      const a = byCode.get(l.accountCode);
      if (!a || l.accountCode === "3900") continue;
      const debitNormal = isDebitNormal(a.type);
      const amt = Math.abs(l.amount);
      const positiveNatural = l.amount > 0;
      const debit = debitNormal === positiveNatural ? amt : 0;
      const credit = debit === 0 ? amt : 0;
      lines.push({ accountCode: a.code, accountName: a.name, debit, credit });
      netDebit += debit - credit;
    }
    if (lines.length === 0) return err("Enter at least one opening balance");

    // Balancing figure to Opening Balance Equity.
    const plug = round2(netDebit);
    if (Math.abs(plug) > 0.005) {
      lines.push(
        plug > 0
          ? { accountCode: "3900", accountName: "Opening Balance Equity", debit: 0, credit: plug }
          : { accountCode: "3900", accountName: "Opening Balance Equity", debit: -plug, credit: 0 },
      );
    }

    await db.$transaction(async (tx) => {
      await ensureCoaAccount(tx, ctx.tenantId, "3900", "Opening Balance Equity", "Equity", "3000", 1);
      const prior = await tx.journalEntryGroup.findFirst({ where: { reference: OPENING_REF, status: "Posted" } });
      if (prior) await reverseJournalEntry(tx, ctx.tenantId, OPENING_REF);
      await applyJournalEntry(tx, ctx.tenantId, ctx, { lines, narration: "Opening balances", reference: OPENING_REF, date: d.asAtDate });
    });
    return ok({ reference: OPENING_REF, plug });
  });
}
