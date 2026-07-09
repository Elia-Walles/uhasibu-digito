"use server";
import { Prisma, type CompanyProfile as DbCompany } from "@prisma/client";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import { updateCompanySchema } from "@/lib/server/schemas/company";
import { ok, err, type Result } from "@/lib/server/result";
import type { Company } from "@/types";

function rowToCompany(c: DbCompany): Company {
  return {
    id: c.id,
    name: c.name,
    shortName: c.shortName,
    tin: c.tin,
    vatNumber: c.vatNumber,
    efdSerial: c.efdSerial,
    nbaaNumber: c.nbaaNumber,
    regNumber: c.regNumber,
    address: c.address,
    branch: c.branch,
    region: c.region,
    businessType: c.businessType,
    email: c.email,
    phone: c.phone,
    website: c.website,
    financialYear: { start: c.financialYearStart, end: c.financialYearEnd },
    fiscalYearStartMonth: c.fiscalYearStartMonth,
    baseCurrency: c.baseCurrency,
    secondaryCurrency: c.secondaryCurrency,
    ...(c.logoUrl ? { logoUrl: c.logoUrl } : {}),
  };
}

/** The tenant's company profile, creating an empty one (named from the tenant) on first read. */
export async function getCompany(): Promise<Company> {
  return withAuth(async (ctx) => {
    let row = await db.companyProfile.findFirst();
    if (!row) {
      const tenant = await db.companyProfile.create({
        data: { tenantId: ctx.tenantId, name: "My Company" },
      });
      row = tenant;
    }
    return rowToCompany(row);
  });
}

export async function updateCompany(input: unknown): Promise<Result<Company>> {
  const parsed = updateCompanySchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  // Strip undefined keys Prisma's update input rejects `undefined` under exactOptionalPropertyTypes.
  const data: Prisma.CompanyProfileUpdateManyMutationInput = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) (data as Record<string, unknown>)[k] = v;
  }
  return withAuth(async (ctx) => {
    const existing = await db.companyProfile.findFirst();
    if (existing) {
      await db.companyProfile.updateMany({ data });
      const row = await db.companyProfile.findFirst();
      return row ? ok(rowToCompany(row)) : err("Company profile not found");
    }
    const created = await db.companyProfile.create({
      data: { ...(data as Prisma.CompanyProfileCreateInput), tenantId: ctx.tenantId, name: parsed.data.name ?? "My Company" },
    });
    return ok(rowToCompany(created));
  });
}
