"use server";
import type { Expense as DbExpense } from "@prisma/client";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import { postExpense } from "@/lib/server/gl-postings";
import { postInputVat, reverseInputVat } from "@/lib/server/pos-posting";
import { canPostFinancials } from "@/lib/auth/roles";
import { reverseJournalEntry } from "@/lib/server/journal-posting";
import { createExpenseSchema, deleteExpenseSchema } from "@/lib/server/schemas/expenses";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum, dateOnly } from "@/lib/server/serialize";
import type { Expense, ExpensePaymentMethod } from "@/types";

function rowToExpense(r: DbExpense): Expense {
  return {
    id: r.id,
    date: dateOnly(r.date),
    category: r.category,
    categoryName: r.categoryName,
    payee: r.payee,
    description: r.description,
    amount: decToNum(r.amount),
    vatAmount: decToNum(r.vatAmount),
    paymentMethod: r.paymentMethod as ExpensePaymentMethod,
    reference: r.reference,
  };
}

export async function listExpenses(): Promise<Expense[]> {
  return withAuth(async () => {
    const rows = await db.expense.findMany({ orderBy: [{ date: "desc" }, { createdAt: "desc" }] });
    return rows.map(rowToExpense);
  });
}

/**
 * Records an expense and posts it to the GL (Dr the expense account, Cr cash/bank or Trade
 * Payables) atomically, so it flows into the income statement and cash/payables balances.
 */
export async function createExpense(input: unknown): Promise<Result<Expense>> {
  const parsed = createExpenseSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  return withAuth(async (ctx) => {
    if (!canPostFinancials(ctx.role)) return err("Your role can't record expenses");
    const account = await db.cOAAccount.findFirst({ where: { code: d.category } });
    if (!account) return err("Unknown expense account");
    if (account.type !== "Expense" && account.type !== "CostOfSales") return err("Pick an expense category");

    const date = new Date(d.date);
    const year = date.getFullYear();
    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
    const base = (await db.expense.count({ where: { createdAt: { gte: yearStart } } })) + 1;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const reference = `EXP-${year}-${String(base + attempt).padStart(5, "0")}`;
      try {
        const created = await db.$transaction(async (tx) => {
          const exp = await tx.expense.create({
            data: {
              tenantId: ctx.tenantId,
              date,
              category: d.category,
              categoryName: account.name,
              payee: d.payee,
              description: d.description,
              amount: d.amount,
              vatAmount: d.vatAmount,
              paymentMethod: d.paymentMethod,
              reference: d.reference,
              journalRef: reference,
            },
          });
          await postExpense(tx, ctx.tenantId, ctx, {
            reference,
            date: dateOnly(date),
            amount: d.amount,
            vat: d.vatAmount,
            categoryCode: d.category,
            categoryName: account.name,
            paymentMethod: d.paymentMethod,
          });
          if (d.vatAmount > 0) {
            await postInputVat(tx, ctx.tenantId, {
              date: dateOnly(date),
              reference,
              description: d.description || `Expense — ${account.name}`,
              net: d.amount - d.vatAmount,
              vat: d.vatAmount,
            });
          }
          return exp;
        });
        return ok(rowToExpense(created));
      } catch (e: unknown) {
        if ((e as { code?: string }).code === "P2002") continue;
        throw e;
      }
    }
    return err("Could not record the expense, please retry");
  });
}

export async function deleteExpense(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = deleteExpenseSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id } = parsed.data;
  return withAuth(async (ctx) => {
    const exp = await db.expense.findFirst({ where: { id } });
    if (!exp) return err("Expense not found");
    await db.$transaction(async (tx) => {
      if (exp.journalRef) await reverseJournalEntry(tx, ctx.tenantId, exp.journalRef);
      const vat = decToNum(exp.vatAmount);
      if (vat > 0) {
        await reverseInputVat(tx, ctx.tenantId, {
          date: dateOnly(exp.date),
          reference: exp.journalRef || exp.reference,
          description: exp.description || `Expense — ${exp.categoryName}`,
          net: decToNum(exp.amount) - vat,
          vat,
        });
      }
      await tx.expense.delete({ where: { id } });
    });
    return ok({ id });
  });
}
