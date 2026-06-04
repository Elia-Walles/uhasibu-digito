import "dotenv/config";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

// Prisma 7 config. Connection URLs live here (not in schema.prisma).
// Prisma 7 does NOT auto-load `.env` when a config file is present, and `env()` only
// reads process.env (throwing if absent) — so we load `.env` ourselves via
// `dotenv/config` above, then resolve with `env()`.
// We point migrate/seed at DATABASE_URL: TiDB Serverless has no separate pooled/direct
// endpoint, so there is no distinct DIRECT_DATABASE_URL to use (the .env placeholder
// for it is unused).
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
