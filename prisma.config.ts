import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 config. Connection URLs live here (not in schema.prisma).
//
// Wave 0: no `datasource.url` yet — `prisma generate`/`validate`/`format` don't
// need a connection, and the placeholder `.env` has no real DB to point at.
// Wave 1 adds, once real TiDB credentials are provisioned:
//
//   import { env } from "prisma/config";
//   datasource: { url: env("DIRECT_DATABASE_URL") }
//
// at which point `prisma migrate dev` / `db seed` become live.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
});
