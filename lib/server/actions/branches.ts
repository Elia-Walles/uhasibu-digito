"use server";
import type { Branch as DbBranch } from "@prisma/client";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import { createBranchSchema, updateBranchSchema } from "@/lib/server/schemas/pos";
import { ok, err, type Result } from "@/lib/server/result";
import type { Branch } from "@/types";

function rowToBranch(b: DbBranch): Branch {
  return {
    id: b.id,
    name: b.name,
    code: b.code,
    region: b.region,
    address: b.address,
    phone: b.phone,
    isPrimary: b.isPrimary,
  };
}

export async function listBranches(): Promise<Branch[]> {
  return withAuth(async () => {
    const rows = await db.branch.findMany({ orderBy: [{ isPrimary: "desc" }, { name: "asc" }] });
    return rows.map(rowToBranch);
  });
}

export async function createBranch(input: unknown): Promise<Result<Branch>> {
  const parsed = createBranchSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;
  const code = (d.code && d.code.length > 0 ? d.code : `BR-${Date.now().toString(36).toUpperCase()}`).toUpperCase();
  return withAuth(async (ctx) => {
    const clash = await db.branch.findFirst({ where: { code } });
    if (clash) return err(`Branch code ${code} already exists`);
    // If this is the tenant's first branch, make it primary regardless of input.
    const count = await db.branch.count();
    const isPrimary = d.isPrimary ?? count === 0;
    const created = await db.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.branch.updateMany({ where: { tenantId: ctx.tenantId }, data: { isPrimary: false } });
      }
      return tx.branch.create({
        data: {
          tenantId: ctx.tenantId,
          name: d.name,
          code,
          region: d.region ?? "",
          address: d.address ?? "",
          phone: d.phone ?? "",
          isPrimary,
        },
      });
    });
    return ok(rowToBranch(created));
  });
}

export async function updateBranch(input: unknown): Promise<Result<Branch>> {
  const parsed = updateBranchSchema.safeParse(input);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");
  const { id, ...rest } = parsed.data;
  const data: Record<string, string | boolean> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined && k !== "code") data[k] = v;
  }
  return withAuth(async (ctx) => {
    try {
      const updated = await db.$transaction(async (tx) => {
        // Only one branch can be primary: promoting this one demotes the others.
        if (data.isPrimary === true) {
          await tx.branch.updateMany({ where: { tenantId: ctx.tenantId, id: { not: id } }, data: { isPrimary: false } });
        }
        return tx.branch.update({ where: { id }, data });
      });
      return ok(rowToBranch(updated));
    } catch {
      return err("Branch not found");
    }
  });
}

export async function deleteBranch(input: unknown): Promise<Result<{ id: string }>> {
  const id = typeof input === "object" && input !== null && "id" in input ? String((input as { id: unknown }).id) : "";
  if (!id) return err("Branch id is required");
  return withAuth(async () => {
    const branch = await db.branch.findFirst({ where: { id } });
    if (!branch) return err("Branch not found");
    const [sales, stock] = await Promise.all([
      db.pOSSale.count({ where: { branchId: id } }),
      db.branchStock.count({ where: { branchId: id, onHand: { gt: 0 } } }),
    ]);
    if (sales > 0) return err("This branch has sales history and can't be deleted.");
    if (stock > 0) return err("This branch still holds stock. Transfer or zero it before deleting.");
    await db.branchStock.deleteMany({ where: { branchId: id } });
    await db.branch.delete({ where: { id } });
    return ok({ id });
  });
}
