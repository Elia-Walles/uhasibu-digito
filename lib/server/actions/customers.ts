"use server";
import type { Customer as DbCustomer } from "@prisma/client";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import { createCustomerSchema } from "@/lib/server/schemas/customers";
import { ok, err, type Result } from "@/lib/server/result";
import { decToNum } from "@/lib/server/serialize";
import type { Customer } from "@/types";

function rowToCustomer(r: DbCustomer): Customer {
  return {
    id: r.id,
    name: r.name,
    contactPerson: r.contactPerson,
    tin: r.tin,
    phone: r.phone,
    email: r.email,
    city: r.city,
    address: r.address,
    creditLimit: decToNum(r.creditLimit),
    outstandingBalance: decToNum(r.outstandingBalance),
    status: r.status as Customer["status"],
    paymentTerms: r.paymentTerms,
    totalRevenue: decToNum(r.totalRevenue),
    country: r.country ?? undefined,
    swiftBic: r.swiftBic ?? undefined,
    beneficiaryBank: r.beneficiaryBank ?? undefined,
    iban: r.iban ?? undefined,
    isInternational: r.isInternational ?? undefined,
  };
}

export async function listCustomers(): Promise<Customer[]> {
  return withAuth(async () => {
    const rows = await db.customer.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(rowToCustomer);
  });
}

export async function createCustomer(input: unknown): Promise<Result<Customer>> {
  const parsed = createCustomerSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  return withAuth(async (ctx) => {
    const created = await db.customer.create({
      data: {
        tenantId: ctx.tenantId,
        name: d.name,
        contactPerson: d.contactPerson,
        tin: d.tin,
        phone: d.phone,
        email: d.email,
        city: d.city,
        address: d.address,
        creditLimit: d.creditLimit,
        paymentTerms: d.paymentTerms,
        status: d.status,
        // Conditional spreads: exactOptionalPropertyTypes forbids passing `undefined`
        // to Prisma's optional inputs, so omit the key entirely when not provided.
        ...(d.country !== undefined && { country: d.country }),
        ...(d.swiftBic !== undefined && { swiftBic: d.swiftBic }),
        ...(d.beneficiaryBank !== undefined && { beneficiaryBank: d.beneficiaryBank }),
        ...(d.iban !== undefined && { iban: d.iban }),
        ...(d.isInternational !== undefined && { isInternational: d.isInternational }),
      },
    });
    return ok(rowToCustomer(created));
  });
}
