import { defineConfig } from "@playwright/test";

// UI-02 Core UI E2E (Issue #33 AC-12) — ARCH-01 §11 strategy: e2e/ at the
// repository root, Chromium first, the confirmed responsive viewport set,
// 1 retry locally. Scope: Login / Catalog / Item Detail core journeys only —
// the request→checkout→loans journey belongs to #11/#12/#13.
try {
  process.loadEnvFile(".env");
} catch {
  // .env is optional at runtime (CI policy is defined at Lab 5).
}

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./specs",
  forbidOnly: !!process.env.CI,
  workers: process.env.CI ? 2 : undefined,
  globalTimeout: process.env.CI ? 10 * 60_000 : undefined,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL,
  },
  webServer: {
    command: "npm run dev",
    // Readiness probe = the legacy login page: it proves the app is up AND
    // that legacy .html pages keep being served (ARCH-01 §12.1 coexistence).
    url: `${baseURL}/login.html`,
    cwd: "..",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { browserName: "chromium", viewport: { width: 1280, height: 800 } },
    },
    {
      name: "tablet-chromium",
      use: { browserName: "chromium", viewport: { width: 768, height: 1024 } },
    },
    {
      name: "mobile-chromium",
      use: { browserName: "chromium", viewport: { width: 390, height: 844 } },
    },
  ],
});
