import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 config. Connection URLs live here (not in schema.prisma).
// `migrate dev` / `db seed` use DIRECT_DATABASE_URL; they go live once the user
// fills real TiDB credentials into `.env`. We read process.env directly (not the
// `env()` helper, which throws on the empty placeholder) so `generate`/`validate`/
// `format` keep working before the DB exists — they don't open a connection.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
  },
});
