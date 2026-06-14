import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

// The always-on gate is the pure-unit tenant-scope suite (no DB). The opt-in real-DB
// suite (RUN_DB_TESTS=1) needs DATABASE_URL vitest does not auto-load `.env`, so we
// load it into the test process env via Vite's loadEnv (empty prefix = all vars).
export default defineConfig(({ mode }) => ({
  test: {
    environment: "node",
    include: ["tests/**/*.spec.ts"],
    env: loadEnv(mode, import.meta.dirname, ""),
  },
  resolve: {
    alias: {
      "@": import.meta.dirname,
    },
  },
}));
