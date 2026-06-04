import { PrismaMariaDb } from "@prisma/adapter-mariadb";

/**
 * Builds the Prisma driver adapter for TiDB. The single place SSL is configured:
 * TiDB Serverless rejects insecure transport, and the mariadb driver does NOT read
 * Prisma's `?sslaccept=strict` query param — it needs an explicit `ssl` option. We
 * parse DATABASE_URL into a PoolConfig and enable verified TLS (Node's CA store).
 */
export function createMariaDbAdapter(): PrismaMariaDb {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) return new PrismaMariaDb({ ssl: { rejectUnauthorized: true } });

  const parsed = new URL(url);
  return new PrismaMariaDb({
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 4000,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    ssl: { rejectUnauthorized: true },
    // TiDB Serverless auto-pauses when idle; the first connection wakes it (cold
    // start), which exceeds the mariadb driver's ~1s default. Give it room.
    connectTimeout: 30_000,
    acquireTimeout: 30_000,
  });
}
