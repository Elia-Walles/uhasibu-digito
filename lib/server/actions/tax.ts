"use server";
import type { TaxFiling as DbTaxFiling, VATReturn as DbVATReturn, VATTransaction as DbVATTx } from "@prisma/client";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import { postTaxRemittance } from "@/lib/server/gl-postings";
import { reverseJournalEntry } from "@/lib/server/journal-posting";
import { updateTaxStatusSchema } from "@/lib/server/schemas/tax";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum, dateOnly } from "@/lib/server/serialize";
import type { TaxFiling, TaxType, TaxStatus, VATReturn, VATTransaction } from "@/types";

function rowToTaxFiling(r: DbTaxFiling): TaxFiling {
  return {
    id: r.id,
    type: r.type as TaxType,
    period: r.period,
    dueDate: dateOnly(r.dueDate),
    amount: decToNum(r.amount),
    status: r.status as TaxStatus,
    ...(r.filedAt ? { filedAt: dateOnly(r.filedAt) } : {}),
  };
}

function txToDomain(t: DbVATTx): VATTransaction {
  return {
    date: dateOnly(t.date),
    reference: t.reference,
    description: t.description,
    netAmount: decToNum(t.netAmount),
    vatRate: decToNum(t.vatRate),
    vatAmount: decToNum(t.vatAmount),
  };
}

function rowToVATReturn(r: DbVATReturn & { transactions: DbVATTx[] }): VATReturn {
  return {
    period: r.period,
    outputVAT: decToNum(r.outputVAT),
    inputVAT: decToNum(r.inputVAT),
    vatPayable: decToNum(r.vatPayable),
    outputTransactions: r.transactions.filter((t) => t.direction === "Output").map(txToDomain),
    inputTransactions: r.transactions.filter((t) => t.direction === "Input").map(txToDomain),
  };
}

export async function listTaxFilings(): Promise<TaxFiling[]> {
  return withAuth(async () => {
    const rows = await db.taxFiling.findMany({ orderBy: { dueDate: "asc" } });
    return rows.map(rowToTaxFiling);
  });
}

export async function listVATReturns(): Promise<VATReturn[]> {
  return withAuth(async () => {
    const rows = await db.vATReturn.findMany({ orderBy: { createdAt: "desc" }, include: { transactions: true } });
    return rows.map(rowToVATReturn);
  });
}

export interface VatGlReconciliation {
  glOutput: number; // GL 2200 balance (output VAT still owed)
  glInput: number; // GL 1250 balance (input VAT recoverable)
  glNet: number; // net VAT liability per the GL
  returnOutput: number;
  returnInput: number;
  returnPayable: number; // net across all VAT returns
}

/** Ties the VAT returns to the GL VAT control accounts (2200 output, 1250 input recoverable). */
export async function getVatGlReconciliation(): Promise<VatGlReconciliation> {
  return withAuth(async () => {
    const [gl, returns] = await Promise.all([
      db.gLEntry.findMany({ where: { accountCode: { in: ["2200", "1250"] } }, select: { accountCode: true, debit: true, credit: true } }),
      db.vATReturn.findMany({ select: { outputVAT: true, inputVAT: true, vatPayable: true } }),
    ]);
    let glOutput = 0;
    let glInput = 0;
    for (const r of gl) {
      if (r.accountCode === "2200") glOutput += decToNum(r.credit) - decToNum(r.debit);
      else glInput += decToNum(r.debit) - decToNum(r.credit);
    }
    const returnOutput = returns.reduce((s, r) => s + decToNum(r.outputVAT), 0);
    const returnInput = returns.reduce((s, r) => s + decToNum(r.inputVAT), 0);
    const returnPayable = returns.reduce((s, r) => s + decToNum(r.vatPayable), 0);
    return { glOutput, glInput, glNet: glOutput - glInput, returnOutput, returnInput, returnPayable };
  });
}

export async function updateTaxStatus(input: unknown): Promise<Result<TaxFiling>> {
  const parsed = updateTaxStatusSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, status, filedAt } = parsed.data;
  return withAuth(async (ctx) => {
    const filing = await db.taxFiling.findFirst({ where: { id } });
    if (!filing) return err("Tax filing not found");

    const amount = decToNum(filing.amount);
    const reference = `TAX-${filing.type}-${filing.period}`;
    // Marking a filing "Filed" remits it (Dr the payable, Cr bank); un-filing reverses that.
    const willRemit = status === "Filed" && !filing.journalRef && amount > 0;
    const willReverse = status !== "Filed" && filing.journalRef !== "";

    const updated = await db.$transaction(async (tx) => {
      if (willRemit) {
        await postTaxRemittance(tx, ctx.tenantId, ctx, {
          reference,
          date: filedAt ?? dateOnly(new Date()),
          amount,
          taxType: filing.type,
        });
      }
      if (willReverse) await reverseJournalEntry(tx, ctx.tenantId, filing.journalRef);

      return tx.taxFiling.update({
        where: { id },
        data: {
          status,
          ...(status === "Filed"
            ? { filedAt: filedAt ? new Date(filedAt) : new Date(), ...(willRemit ? { journalRef: reference } : {}) }
            : { journalRef: "" }),
        },
      });
    });
    return ok(rowToTaxFiling(updated));
  });
}
