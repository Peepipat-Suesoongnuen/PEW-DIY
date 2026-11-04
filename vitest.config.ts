import { defineConfig } from "vitest/config";

/**
 * Test discovery is restricted to source tests so compiled `dist/test/*.test.js`
 * files are never picked up after `npm run build` (PR #22 review, P1).
 * File parallelism is disabled because all test files share one PostgreSQL
 * test database.
 */
export default defineConfig({
  test: {
    include: ["src/test/**/*.test.ts"],
    exclude: ["dist/**", "node_modules/**"],
    fileParallelism: false,
  },
});
