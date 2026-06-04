"use server";
import type { TaxFiling as DbTaxFiling, VATReturn as DbVATReturn, VATTransaction as DbVATTx } from "@prisma/client";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
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

export async function updateTaxStatus(input: unknown): Promise<Result<TaxFiling>> {
  const parsed = updateTaxStatusSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, status, filedAt } = parsed.data;
  return withAuth(async () => {
    try {
      const updated = await db.taxFiling.update({
        where: { id },
        data: {
          status,
          ...(status === "Filed" ? { filedAt: filedAt ? new Date(filedAt) : new Date() } : {}),
        },
      });
      return ok(rowToTaxFiling(updated));
    } catch {
      return err("Tax filing not found");
    }
  });
}
