import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createMariaDbAdapter } from "../lib/server/db-adapter";

// One-off backfill for the per-branch stock rollout. For every tenant that has inventory,
// seed a BranchStock row at the tenant's primary branch with onHand = InventoryItem.onHand,
// so existing global stock isn't stranded when reads switch to per-branch. Idempotent:
// re-running upserts the same rows. Tenants with no branch are skipped (nothing to attribute
// to) — their global onHand still works.
const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });

async function main() {
  const items = await prisma.inventoryItem.findMany({
    select: { id: true, tenantId: true, onHand: true },
  });
  const byTenant = new Map<string, typeof items>();
  for (const it of items) {
    const list = byTenant.get(it.tenantId) ?? [];
    list.push(it);
    byTenant.set(it.tenantId, list);
  }

  let seeded = 0;
  let skippedTenants = 0;
  for (const [tenantId, tenantItems] of byTenant) {
    const branch =
      (await prisma.branch.findFirst({ where: { tenantId, isPrimary: true } })) ??
      (await prisma.branch.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" } }));
    if (!branch) {
      skippedTenants += 1;
      console.warn(`Tenant ${tenantId}: no branch — skipped ${tenantItems.length} item(s).`);
      continue;
    }
    for (const it of tenantItems) {
      await prisma.branchStock.upsert({
        where: { tenantId_branchId_itemId: { tenantId, branchId: branch.id, itemId: it.id } },
        create: { tenantId, branchId: branch.id, itemId: it.id, onHand: it.onHand },
        update: { onHand: it.onHand },
      });
      seeded += 1;
    }
    console.log(`Tenant ${tenantId}: seeded ${tenantItems.length} item(s) at branch "${branch.name}".`);
  }

  console.log(`\nDone. ${seeded} BranchStock row(s) upserted; ${skippedTenants} tenant(s) skipped (no branch).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
