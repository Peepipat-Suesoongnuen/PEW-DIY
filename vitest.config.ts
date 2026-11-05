import { defineConfig } from "vitest/config";

/**
 * Test discovery is restricted to `server/tests` so compiled `dist/` output is
 * never picked up (PR #22 review, P1) and tests live outside production code
 * (FIX-A). File parallelism is disabled because all test files share one
 * PostgreSQL test database.
 */
export default defineConfig({
  test: {
    include: ["server/tests/**/*.test.ts"],
    exclude: ["dist/**", "node_modules/**", "client/**"],
    fileParallelism: false,
  },
});
