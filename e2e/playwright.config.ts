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

const serverPort = process.env.PORT ?? "3000";
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${serverPort}`;
const baseUrl = new URL(baseURL);
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is required; E2E must use an isolated test database.");
}

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
    // Readiness probe uses the current React login route, not the retired
    // legacy .html page.
    url: `${baseURL}/login`,
    // The integration spec writes directly through TEST_DATABASE_URL, so the
    // app under test must use that same database. Keep its trusted origin and
    // listening port aligned with Playwright's baseURL.
    env: {
      DATABASE_URL: testDatabaseUrl,
      PORT: baseUrl.port || serverPort,
      APP_ORIGIN: baseUrl.origin,
    },
    cwd: "..",
    // Never reuse a developer/Compose server that may point at another DB.
    reuseExistingServer: false,
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
