import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { createMariaDbAdapter } from "../lib/server/db-adapter";
import { STANDARD_COA, DEFAULT_DEPARTMENTS } from "@/lib/config/chart-of-accounts";
import { PLANS } from "@/lib/auth/tiers";

// Production seed for the AFYALEAD COMPANY tenant. Creates the owner account, company
// profile, a standard Tanzanian Chart of Accounts, and default departments NO fake
// business data. Also wipes the legacy "kilimanjaro" demo tenant + its data. Idempotent.
const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });

const OWNER_EMAIL = "eliawalles56@gmail.com";
const OWNER_NAME = "elia walles";
const OWNER_PASSWORD = "Walles.777";
const COMPANY_NAME = "AFYALEAD COMPANY";
const COMPANY_SLUG = "afyalead";

// Tenant-less platform super-admin (operator) has no tenant, lands straight in /admin.
const PLATFORM_ADMIN_EMAIL = "uhasibudigito@gmail.com";
const PLATFORM_ADMIN_NAME = "Uhasibu Digito Admin";
const PLATFORM_ADMIN_PASSWORD = "Uhasibu@digito3035";

/** Delete a tenant and every row scoped to it (children before parents), if it exists. */
async function wipeTenant(slug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return;
  const tenantId = tenant.id;
  const where = { where: { tenantId } };

  // Children / line tables first.
  await prisma.document.deleteMany(where);
  await prisma.invoiceLine.deleteMany(where);
  await prisma.quotationLine.deleteMany(where);
  await prisma.pOLine.deleteMany(where);
  await prisma.vATTransaction.deleteMany(where);
  await prisma.bankTransaction.deleteMany(where);
  await prisma.gLEntry.deleteMany(where);
  await prisma.stockMovement.deleteMany(where);
  await prisma.payrollRunEmployee.deleteMany(where);
  await prisma.employeeAllowance.deleteMany(where);
  await prisma.sendLogEntry.deleteMany(where);
  await prisma.auditStepResult.deleteMany(where);
  // Parents.
  await prisma.invoice.deleteMany(where);
  await prisma.quotation.deleteMany(where);
  await prisma.purchaseOrder.deleteMany(where);
  await prisma.vATReturn.deleteMany(where);
  await prisma.journalEntryGroup.deleteMany(where);
  await prisma.bankAccount.deleteMany(where);
  await prisma.inventoryItem.deleteMany(where);
  await prisma.payrollRun.deleteMany(where);
  await prisma.taxFiling.deleteMany(where);
  await prisma.fixedAsset.deleteMany(where);
  await prisma.budgetLine.deleteMany(where);
  await prisma.auditEngagement.deleteMany(where);
  await prisma.lead.deleteMany(where);
  await prisma.pipelineDeal.deleteMany(where);
  await prisma.supplier.deleteMany(where);
  await prisma.customer.deleteMany(where);
  await prisma.cOAAccount.deleteMany(where);
  await prisma.auditLog.deleteMany(where);
  await prisma.companyProfile.deleteMany(where);
  // Users reference Department delete users before departments.
  await prisma.user.deleteMany(where);
  await prisma.department.deleteMany(where);
  await prisma.employee.deleteMany(where);
  await prisma.tenant.delete({ where: { id: tenantId } });
  console.log(`Wiped legacy tenant "${slug}".`);
}

async function main() {
  await wipeTenant("kilimanjaro");

  const tenant = await prisma.tenant.upsert({
    where: { slug: COMPANY_SLUG },
    update: { name: COMPANY_NAME, tier: "premium" },
    create: { name: COMPANY_NAME, slug: COMPANY_SLUG, tier: "premium" },
  });

  await prisma.companyProfile.upsert({
    where: { tenantId: tenant.id },
    update: { name: COMPANY_NAME },
    create: { tenantId: tenant.id, name: COMPANY_NAME, email: OWNER_EMAIL, baseCurrency: "TZS" },
  });

  const passwordHash = await hash(OWNER_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: { name: OWNER_NAME, role: "Admin", initials: "EW", passwordHash, tenantId: tenant.id, isSuperAdmin: true },
    create: {
      email: OWNER_EMAIL,
      name: OWNER_NAME,
      role: "Admin",
      initials: "EW",
      passwordHash,
      tenantId: tenant.id,
      isSuperAdmin: true,
    },
  });

  // Platform subscription plans DB-backed source of truth for billing display, seeded
  // from the canonical PLANS constant (lib/auth/tiers.ts). Idempotent (upsert by key).
  for (let i = 0; i < PLANS.length; i++) {
    const p = PLANS[i]!;
    await prisma.plan.upsert({
      where: { key: p.id },
      update: { name: p.name, tagline: p.tagline, priceTzs: p.priceTzs, features: JSON.stringify(p.features), highlighted: p.highlighted, sortOrder: i },
      create: {
        key: p.id,
        name: p.name,
        tagline: p.tagline,
        priceTzs: p.priceTzs,
        features: JSON.stringify(p.features),
        highlighted: p.highlighted,
        sortOrder: i,
      },
    });
  }
  // Drop any plan rows no longer in the catalogue (e.g. the legacy "enterprise" plan).
  await prisma.plan.deleteMany({ where: { key: { notIn: PLANS.map((p) => p.id) } } });

  // Platform operator a super-admin with no tenant (manages the SaaS, not bookkeeping).
  const platformAdminHash = await hash(PLATFORM_ADMIN_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: PLATFORM_ADMIN_EMAIL },
    update: { name: PLATFORM_ADMIN_NAME, role: "Admin", initials: "UD", passwordHash: platformAdminHash, isSuperAdmin: true },
    create: {
      email: PLATFORM_ADMIN_EMAIL,
      name: PLATFORM_ADMIN_NAME,
      role: "Admin",
      initials: "UD",
      passwordHash: platformAdminHash,
      isSuperAdmin: true,
    },
  });

  const existingCOA = await prisma.cOAAccount.count({ where: { tenantId: tenant.id } });
  if (existingCOA === 0) {
    await prisma.cOAAccount.createMany({
      data: STANDARD_COA.map((a) => ({
        tenantId: tenant.id,
        code: a.code,
        name: a.name,
        type: a.type,
        parentCode: a.parentCode,
        openingBalance: a.openingBalance,
        movement: a.movement,
        closingBalance: a.closingBalance,
        level: a.level,
      })),
      skipDuplicates: true,
    });
  }

  for (const name of DEFAULT_DEPARTMENTS) {
    const existing = await prisma.department.findFirst({ where: { tenantId: tenant.id, name } });
    if (!existing) await prisma.department.create({ data: { tenantId: tenant.id, name } });
  }

  console.log(
    `Seeded "${COMPANY_NAME}" (slug ${COMPANY_SLUG}) owner ${OWNER_EMAIL}, platform admin ${PLATFORM_ADMIN_EMAIL}, ${PLANS.length} plans, ${STANDARD_COA.length} COA accounts, ${DEFAULT_DEPARTMENTS.length} departments. No business data.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
