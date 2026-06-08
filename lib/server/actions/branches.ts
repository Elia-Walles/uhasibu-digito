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
    const created = await db.branch.create({
      data: {
        tenantId: ctx.tenantId,
        name: d.name,
        code,
        region: d.region ?? "",
        address: d.address ?? "",
        phone: d.phone ?? "",
        isPrimary: d.isPrimary ?? count === 0,
      },
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
  return withAuth(async () => {
    try {
      const updated = await db.branch.update({ where: { id }, data });
      return ok(rowToBranch(updated));
    } catch {
      return err("Branch not found");
    }
  });
}
