import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Component tests (UI-02 AC-3) — Vitest + jsdom + Testing Library (ARCH-01 §3.3).
// Discovery is restricted to client/src so the root `server/tests` suite is
// untouched (root vitest.config.ts also excludes client/**).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
  },
});
