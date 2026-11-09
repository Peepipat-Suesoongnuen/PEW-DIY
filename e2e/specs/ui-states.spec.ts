import { expect, test } from "@playwright/test";
import { ACCOUNTS } from "../pages/fixtures";
import { LoginPage } from "../pages/login.page";

/**
 * ui-states (ARCH-01 §11): loading / empty / 401 / error states via route
 * interception — Issue #33 AC-8 (ui-spec §0.3), plus the serving contract
 * checks for AC-1 (app shell at "/" and /api never falls to index.html).
 */
test.describe("shared UI states (f-02 §3 / ui-spec §0.3)", () => {
  test("loading state is shown while the catalog request is in flight", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.signIn(ACCOUNTS.borrower());

    // Delay the catalog payload after the app already mounted.
    await page.route("**/api/equipment", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await route.continue();
    });
    await page.goto("/catalog");
    await expect(page.getByText("Loading catalog…")).toBeVisible();
    await expect(
      page.getByText("Synthetic single-unit fixture").filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("empty catalog renders a dedicated empty state, not an error", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.signIn(ACCOUNTS.borrower());

    await page.route("**/api/equipment", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [] }),
      }),
    );
    await page.goto("/catalog");
    await expect(page.getByText("The catalog has no items yet.")).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  });

  test("server failure shows a generic retry message with requestId — never false-empty", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.signIn(ACCOUNTS.borrower());

    await page.route("**/api/equipment", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "SERVICE_UNAVAILABLE", message: "Service temporarily unavailable.", requestId: "req-e2e-1" },
        }),
      }),
    );
    await page.goto("/catalog");
    await expect(page.getByText("Something went wrong. Please try again.")).toBeVisible();
    await expect(page.getByText("Request ID: req-e2e-1")).toBeVisible();
    await expect(page.getByText("The catalog has no items yet.")).toHaveCount(0);
  });

  test("401 during browsing returns to Login with the expired-session notice", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.signIn(ACCOUNTS.borrower());

    await page.route("**/api/equipment", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "UNAUTHENTICATED", message: "Sign in required.", requestId: "n/a" } }),
      }),
    );
    await page.goto("/catalog");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Your session has expired. Please sign in again.")).toBeVisible();
  });

  test("serving contract: app shell at / and /api unknown routes stay JSON (AC-1)", async ({ page, request }) => {
    const shell = await request.get("/");
    expect(shell.status()).toBe(200);
    expect(shell.headers()["content-type"]).toContain("text/html");

    // /api/* must never fall through to the SPA shell: unknown API paths
    // return the safe JSON envelope. (Unauthenticated callers get 401 from
    // the auth guard before the 404 handler — pre-existing contract behavior,
    // unchanged by UI-02; either way the response is JSON, never index.html.)
    const apiUnknown = await request.get("/api/definitely-unknown");
    expect([401, 404]).toContain(apiUnknown.status());
    expect(apiUnknown.headers()["content-type"]).toContain("application/json");
    expect((await apiUnknown.json()).error.code).toBeTruthy();

    // Unknown HTML navigations get the SPA shell (ARCH-01 §12.1), while real
    // files win: legacy pages keep being served alongside the React app.
    const spaRoute = await request.get("/some/client/route");
    expect(spaRoute.status()).toBe(200);
    expect(spaRoute.headers()["content-type"]).toContain("text/html");
    const legacy = await request.get("/login.html");
    expect(legacy.status()).toBe(200);
  });
});
