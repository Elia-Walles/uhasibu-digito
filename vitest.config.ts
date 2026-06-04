import { defineConfig } from "vitest/config";

// No Docker, no database: the tenant-isolation gate runs as pure-unit tests of
// the scoping policy (lib/server/tenant-scope.ts) + request context. The real-DB
// integration test arrives in Wave 1 against actual TiDB.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.spec.ts"],
  },
  resolve: {
    alias: {
      "@": import.meta.dirname,
    },
  },
});
