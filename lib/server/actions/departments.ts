"use server";
import { db } from "@/lib/server/db";
import { withAuth } from "@/lib/server/with-auth";
import {
  createDepartmentSchema,
  renameDepartmentSchema,
  departmentIdSchema,
} from "@/lib/server/schemas/departments";
import { ok, err, type Result } from "@/lib/server/result";
import type { Department } from "@/types";

export async function listDepartments(): Promise<Department[]> {
  return withAuth(async () => {
    const rows = await db.department.findMany({ orderBy: { name: "asc" } });
    return rows.map((d) => ({ id: d.id, name: d.name }));
  });
}

export async function createDepartment(input: { name: string }): Promise<Result<Department>> {
  const parsed = createDepartmentSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { name } = parsed.data;
  return withAuth(async (ctx) => {
    const existing = await db.department.findMany();
    if (existing.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      return err(`Department "${name}" already exists`);
    }
    // tenantId is also injected by the extension; passing it satisfies the type.
    const created = await db.department.create({ data: { name, tenantId: ctx.tenantId } });
    return ok({ id: created.id, name: created.name });
  });
}

export async function renameDepartment(input: { id: string; name: string }): Promise<Result<Department>> {
  const parsed = renameDepartmentSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { id, name } = parsed.data;
  return withAuth(async () => {
    try {
      const updated = await db.department.update({ where: { id }, data: { name } });
      return ok({ id: updated.id, name: updated.name });
    } catch {
      return err("Department not found");
    }
  });
}

export async function deleteDepartment(input: { id: string }): Promise<Result<{ id: string }>> {
  const parsed = departmentIdSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { id } = parsed.data;
  return withAuth(async () => {
    try {
      await db.department.delete({ where: { id } });
      return ok({ id });
    } catch {
      return err("Department not found");
    }
  });
}
