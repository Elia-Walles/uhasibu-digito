import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { createMariaDbAdapter } from "../lib/server/db-adapter";
import { CUSTOMERS } from "@/lib/mock-data/customers";
import { INVOICES } from "@/lib/mock-data/invoices";

// Demo seed for Kilimanjaro Trading Co. Runs via `npm run db:seed` (tsx) once real
// `.env` credentials exist. Uses the raw client (no tenant extension), so tenantId is
// passed explicitly. Idempotent — safe to re-run. Extended with domain data in later
// waves; Wave 1 seeds only what auth + departments need.
const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });

// Distinct departments from lib/mock-data/employees.ts (hardcoded so the seed has no
// runtime dependency on the alias-importing mock module).
const DEPARTMENTS = ["Admin", "Finance", "HR", "Logistics", "Sales", "Warehouse", "Zanzibar"];

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "kilimanjaro" },
    update: {},
    create: { name: "Kilimanjaro Trading Company Limited", slug: "kilimanjaro", tier: "pro" },
  });

  const passwordHash = await hash("Demo@2024", 12);
  await prisma.user.upsert({
    where: { email: "demo@uhasibudigito.co.tz" },
    update: { name: "Elia Mwangi", role: "CFO", initials: "EM", passwordHash, tenantId: tenant.id },
    create: {
      email: "demo@uhasibudigito.co.tz",
      name: "Elia Mwangi",
      role: "CFO",
      initials: "EM",
      passwordHash,
      tenantId: tenant.id,
    },
  });

  for (const name of DEPARTMENTS) {
    const existing = await prisma.department.findFirst({ where: { tenantId: tenant.id, name } });
    if (!existing) {
      await prisma.department.create({ data: { tenantId: tenant.id, name } });
    }
  }

  console.log(`Seeded tenant "${tenant.slug}" — demo user + ${DEPARTMENTS.length} departments.`);

  // Business data — batched so remote TiDB latency stays bearable. Customer ids are
  // preserved so the mock invoices' customerId FKs line up. Skip if already seeded.
  const existingCustomers = await prisma.customer.count({ where: { tenantId: tenant.id } });
  if (existingCustomers === 0) {
    await prisma.customer.createMany({
      data: CUSTOMERS.map((c) => ({
        id: c.id,
        tenantId: tenant.id,
        name: c.name,
        contactPerson: c.contactPerson,
        tin: c.tin,
        phone: c.phone,
        email: c.email,
        city: c.city,
        address: c.address,
        creditLimit: c.creditLimit,
        outstandingBalance: c.outstandingBalance,
        status: c.status,
        paymentTerms: c.paymentTerms,
        totalRevenue: c.totalRevenue,
        country: c.country ?? null,
        swiftBic: c.swiftBic ?? null,
        beneficiaryBank: c.beneficiaryBank ?? null,
        iban: c.iban ?? null,
        isInternational: c.isInternational ?? null,
      })),
      skipDuplicates: true,
    });

    await prisma.invoice.createMany({
      data: INVOICES.map((inv) => ({
        id: inv.id,
        tenantId: tenant.id,
        number: inv.number,
        customerId: inv.customerId,
        customerName: inv.customerName,
        issueDate: new Date(inv.issueDate),
        dueDate: new Date(inv.dueDate),
        subtotal: inv.subtotal,
        discount: inv.discount,
        vatAmount: inv.vatAmount,
        total: inv.total,
        status: inv.status,
        efdNumber: inv.efdNumber,
        notes: inv.notes,
        paidAt: inv.paidAt ? new Date(inv.paidAt) : null,
      })),
      skipDuplicates: true,
    });

    const lineData = INVOICES.flatMap((inv) =>
      inv.lines.map((l) => ({
        tenantId: tenant.id,
        invoiceId: inv.id,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountPct: l.discountPct,
        vatPct: l.vatPct,
        lineTotal: l.lineTotal,
      })),
    );
    await prisma.invoiceLine.createMany({ data: lineData, skipDuplicates: true });
    console.log(`Seeded ${CUSTOMERS.length} customers, ${INVOICES.length} invoices, ${lineData.length} lines.`);
  } else {
    console.log(`Customers already present (${existingCustomers}) — skipped business-data seed.`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
