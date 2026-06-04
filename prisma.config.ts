import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 config. Connection URLs live here (not in schema.prisma).
// Prisma 7 does NOT auto-load `.env` when a config file is present, so we load it ourselves
// via `dotenv/config` above for local migrate/seed. We resolve DATABASE_URL with plain
// `process.env` (NOT prisma's `env()` helper, which throws when the var is absent): this
// config is loaded by `prisma generate` during the Vercel build, where DATABASE_URL is not
// present — and generate doesn't connect, so an empty URL is fine. Only the CLI
// (migrate/seed/studio) uses this URL; the runtime client connects via the driver adapter
// in lib/server/db-adapter.ts, which reads DATABASE_URL itself at request time.
// TiDB Serverless has no separate pooled/direct endpoint, so there is no DIRECT_DATABASE_URL.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
