import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { createMariaDbAdapter } from "../lib/server/db-adapter";

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
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
