import type { db } from "./db";
import type { RequestContext } from "./request-context";
import { applyJournalEntry, type JournalLineInput } from "./journal-posting";
import { ensureCoaAccount } from "./gl-postings";

// The interactive-transaction client for the extended `db`.
type Tx = Omit<typeof db, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export interface AssetDisposalInput {
  assetId: string;
  proceeds: number;
  date: string; // YYYY-MM-DD
}

/**
 * Disposal-with-GL: in one transaction, mark the FixedAsset disposed AND post the balanced
 * disposal journal via applyJournalEntry (which, because the proceeds line uses bank code
 * 1010, cascades into BankAccount/BankTransaction). Closes the asset → GL → bank loop.
 * tenantId-scoped explicitly; testable with the raw tx client. Returns null if the asset
 * doesn't belong to the tenant.
 */
export async function applyAssetDisposal(
  tx: Tx,
  tenantId: string,
  ctx: RequestContext,
  input: AssetDisposalInput,
): Promise<{ gainLoss: number } | null> {
  const asset = await tx.fixedAsset.findFirst({ where: { id: input.assetId, tenantId } });
  if (!asset) return null;

  const cost = Number(asset.cost);
  const accDep = Number(asset.accumulatedDepreciation);
  const nbv = cost - accDep;
  const gainLoss = input.proceeds - nbv;

  await tx.fixedAsset.update({
    where: { id: asset.id },
    data: {
      status: "Disposed",
      disposalDate: new Date(input.date),
      disposalProceeds: input.proceeds,
      gainLoss,
      netBookValue: 0,
    },
  });

  // Ensure the contra-asset + gain/loss accounts exist (not in older tenants' seed) so the
  // disposal actually flows into the balance sheet / income statement.
  await ensureCoaAccount(tx, tenantId, "1590", "Accumulated Depreciation", "Asset", "1000", 1);
  await ensureCoaAccount(tx, tenantId, "4200", "Gain on Asset Disposal", "Income", "4000", 1);
  await ensureCoaAccount(tx, tenantId, "6500", "Loss on Asset Disposal", "Expense", "6000", 1);

  const lines: JournalLineInput[] = [
    { accountCode: "1110", accountName: "CRDB TZS Account", description: `Proceeds ${asset.name}`, debit: input.proceeds, credit: 0 },
    { accountCode: "1590", accountName: "Accumulated Depreciation", description: `Disposal ${asset.name}`, debit: accDep, credit: 0 },
    { accountCode: "1500", accountName: "Property, Plant & Equipment", description: `Disposal ${asset.name}`, debit: 0, credit: cost },
  ];
  if (gainLoss > 0) {
    lines.push({ accountCode: "4200", accountName: "Gain on Asset Disposal", description: `Gain ${asset.name}`, debit: 0, credit: gainLoss });
  } else if (gainLoss < 0) {
    lines.push({ accountCode: "6500", accountName: "Loss on Asset Disposal", description: `Loss ${asset.name}`, debit: -gainLoss, credit: 0 });
  }

  await applyJournalEntry(tx, tenantId, ctx, {
    reference: `FA-DISP-${asset.code}`,
    narration: `Disposal of ${asset.name} (${asset.code}) for TZS ${input.proceeds.toLocaleString()}`,
    date: input.date,
    lines,
  });

  return { gainLoss };
}
