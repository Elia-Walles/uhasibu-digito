"use server";
import { hash } from "bcryptjs";
import { authDb } from "@/lib/server/auth-db";
import { registerSchema, type RegisterInput } from "@/lib/server/schemas/auth";
import { ok, err, type Result } from "@/lib/server/result";

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "tenant";
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/);
  const initials = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  return initials || "U";
}

/**
 * Registers a new company: creates the Tenant and its first User (the owner) in a
 * single transaction. Uses the raw, unscoped client because no tenant is bound yet.
 * The client signs the user in via `signIn("credentials", ...)` after this returns ok.
 */
export async function registerTenant(
  input: RegisterInput,
): Promise<Result<{ userId: string; tenantId: string }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { name, companyName, email, password } = parsed.data;

  const existing = await authDb.user.findUnique({ where: { email } });
  if (existing) {
    return err("An account with this email already exists");
  }

  const passwordHash = await hash(password, 12);
  const baseSlug = slugify(companyName);

  try {
    const result = await authDb.$transaction(async (tx) => {
      let slug = baseSlug;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const clash = await tx.tenant.findUnique({ where: { slug } });
        if (!clash) break;
        slug = `${baseSlug}-${attempt + 2}`;
      }
      const tenant = await tx.tenant.create({ data: { name: companyName, slug } });
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: "Admin",
          initials: initialsFrom(name),
          tenantId: tenant.id,
        },
      });
      return { userId: user.id, tenantId: tenant.id };
    });
    return ok(result);
  } catch {
    return err("Could not create your account. Please try again.");
  }
}
