import "dotenv/config";
import { hash } from "bcryptjs";
import { authDb } from "@/lib/server/auth-db";
import { db } from "@/lib/server/db";
import { runWithContext, type RequestContext } from "@/lib/server/request-context";
import { STANDARD_COA, DEFAULT_DEPARTMENTS } from "@/lib/config/chart-of-accounts";
import { createInvoiceCore } from "@/lib/server/invoice-create";
import { postExpense } from "@/lib/server/gl-postings";
import { postInputVat } from "@/lib/server/pos-posting";
import { applyJournalEntry } from "@/lib/server/journal-posting";

// Seeds a SEPARATE, self-contained demo tenant with a coherent set of live transactions (capital,
// a bank account, invoices, payments, VAT expenses) so the app demos with real numbers. Never
// touches the production tenant. Idempotent: re-running skips transaction seeding once invoices exist.
const SLUG = "demo-co";
const NAME = "Kilimanjaro Trading (Demo)";
const OWNER_EMAIL = "demo@uhasibudigito.co.tz";
const OWNER_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "Demo@1234";

async function main() {
  const tenant = await authDb.tenant.upsert({
    where: { slug: SLUG },
    update: { name: NAME, tier: "premium" },
    create: { name: NAME, slug: SLUG, tier: "premium" },
  });

  await authDb.companyProfile.upsert({
    where: { tenantId: tenant.id },
    update: { name: NAME },
    create: { tenantId: tenant.id, name: NAME, email: OWNER_EMAIL, tin: "123-456-789", vatNumber: "40-123456-E", efdSerial: "EFD-2026-DEMO001", baseCurrency: "TZS", fiscalYearStartMonth: 1 },
  });

  const owner = await authDb.user.upsert({
    where: { email: OWNER_EMAIL },
    update: { tenantId: tenant.id, role: "Admin", name: "Demo Owner" },
    create: { email: OWNER_EMAIL, name: "Demo Owner", role: "Admin", initials: "DO", passwordHash: await hash(OWNER_PASSWORD, 12), tenantId: tenant.id, emailVerified: new Date() },
  });

  if ((await authDb.cOAAccount.count({ where: { tenantId: tenant.id } })) === 0) {
    await authDb.cOAAccount.createMany({
      data: STANDARD_COA.map((a) => ({ tenantId: tenant.id, code: a.code, name: a.name, type: a.type, parentCode: a.parentCode, openingBalance: 0, movement: 0, closingBalance: 0, level: a.level })),
      skipDuplicates: true,
    });
  }
  for (const name of DEFAULT_DEPARTMENTS) {
    const e = await authDb.department.findFirst({ where: { tenantId: tenant.id, name } });
    if (!e) await authDb.department.create({ data: { tenantId: tenant.id, name } });
  }

  if ((await authDb.invoice.count({ where: { tenantId: tenant.id } })) > 0) {
    console.log(`Demo tenant "${SLUG}" already has transactions — skipping. Owner: ${OWNER_EMAIL}`);
    return;
  }

  const ctx: RequestContext = { tenantId: tenant.id, userId: owner.id, role: "Admin", branchId: null, userName: "Demo Owner" };
  await runWithContext(ctx, async () => {
    // Owner capital: Dr Cash on Hand / Cr Share Capital.
    await db.$transaction((tx) => applyJournalEntry(tx, tenant.id, ctx, {
      lines: [{ accountCode: "1140", accountName: "Cash on Hand", debit: 10_000_000, credit: 0 }, { accountCode: "3100", accountName: "Share Capital", debit: 0, credit: 10_000_000 }],
      narration: "Owner capital injection", reference: "DEMO-CAP-1", date: "2026-01-05",
    }));

    // Bank account with a 5,000,000 opening balance (mirror moves the account balance).
    const bank = await db.bankAccount.create({ data: { tenantId: tenant.id, bankName: "CRDB Bank", accountName: "Main Current", accountNumber: "0150-1234567", currency: "TZS", coaAccountCode: "1110", balance: 0 } });
    await db.$transaction((tx) => applyJournalEntry(tx, tenant.id, ctx, {
      lines: [{ accountCode: "1110", accountName: "CRDB Bank", debit: 5_000_000, credit: 0 }, { accountCode: "3900", accountName: "Opening Balance Equity", debit: 0, credit: 5_000_000 }],
      narration: "Bank opening balance", reference: `BANK-OPEN-${bank.id.slice(-8)}`, date: "2026-01-05",
    }));

    // Customers.
    const custs: Array<[string, string, string, string, string]> = [
      ["Meru Traders", "Neema Mushi", "201-334-556", "+255 754 100 200", "Arusha"],
      ["Kibo Supplies", "John Kileo", "202-441-778", "+255 715 300 400", "Moshi"],
      ["Serengeti Foods", "Asha Ally", "203-556-889", "+255 786 500 600", "Dar es Salaam"],
    ];
    const customerIds: string[] = [];
    for (const [name, contactPerson, tin, phone, city] of custs) {
      const c = await db.customer.create({ data: { tenantId: tenant.id, name, contactPerson, tin, phone, email: `${name.split(" ")[0]!.toLowerCase()}@example.co.tz`, city, address: `${city}, Tanzania`, paymentTerms: "Net 30" } });
      customerIds.push(c.id);
    }

    const line = (description: string, quantity: number, unitPrice: number) => ({ description, quantity, unitPrice, discountPct: 0, vatPct: 18 });
    await createInvoiceCore(ctx, { customerId: customerIds[0]!, issueDate: "2026-02-10", dueDate: "2026-03-12", status: "Sent", notes: "", lines: [line("Consulting services", 1, 2_000_000), line("Training workshop", 2, 500_000)] });
    await createInvoiceCore(ctx, { customerId: customerIds[1]!, issueDate: "2026-02-18", dueDate: "2026-03-20", status: "Paid", paidAt: "2026-02-25", notes: "", lines: [line("Bulk goods supply", 10, 150_000)] });
    await createInvoiceCore(ctx, { customerId: customerIds[2]!, issueDate: "2026-03-02", dueDate: "2026-04-01", status: "Sent", notes: "", lines: [line("Monthly retainer", 1, 1_200_000)] });

    // Expenses (one VAT-inclusive → input VAT to 1250 + VAT return).
    await db.$transaction(async (tx) => {
      await tx.expense.create({ data: { tenantId: tenant.id, date: new Date("2026-02-15"), category: "6200", categoryName: "Rent & Utilities", payee: "Kilimanjaro Properties", description: "Office rent — February", amount: 590_000, vatAmount: 90_000, paymentMethod: "bank", reference: "", journalRef: "EXP-2026-00001" } });
      await postExpense(tx, tenant.id, ctx, { reference: "EXP-2026-00001", date: "2026-02-15", amount: 590_000, vat: 90_000, categoryCode: "6200", categoryName: "Rent & Utilities", paymentMethod: "bank" });
      await postInputVat(tx, tenant.id, { date: "2026-02-15", reference: "EXP-2026-00001", description: "Office rent — February", net: 500_000, vat: 90_000 });
    });
    await db.$transaction(async (tx) => {
      await tx.expense.create({ data: { tenantId: tenant.id, date: new Date("2026-02-28"), category: "6100", categoryName: "Staff Costs", payee: "Payroll", description: "Casual staff wages", amount: 1_800_000, vatAmount: 0, paymentMethod: "bank", reference: "", journalRef: "EXP-2026-00002" } });
      await postExpense(tx, tenant.id, ctx, { reference: "EXP-2026-00002", date: "2026-02-28", amount: 1_800_000, categoryCode: "6100", categoryName: "Staff Costs", paymentMethod: "bank" });
    });
  });

  console.log(`Seeded demo tenant "${NAME}" (slug ${SLUG}) — owner ${OWNER_EMAIL}. 3 customers, 3 invoices, 2 expenses, a bank account and opening capital.`);
}

main()
  .then(() => authDb.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await authDb.$disconnect();
    process.exit(1);
  });
