import { expect, test } from "@playwright/test";
import { ACCOUNTS } from "../pages/fixtures";
import { CatalogPage } from "../pages/catalog.page";
import { LoginPage } from "../pages/login.page";

/**
 * auth-journey (ARCH-01 §11): login → catalog → logout; invalid login;
 * session-expiry redirect. Covers AC-F01-11 + Issue #33 AC-4.
 */
test.describe("auth journey", () => {
  test("login as Borrower lands on the catalog; sign out returns to Login", async ({ page }) => {
    const login = new LoginPage(page);
    const catalog = new CatalogPage(page);

    await login.goto();
    await login.expectLoaded();
    await login.signIn(ACCOUNTS.borrower());

    await expect(page).toHaveURL(/\/catalog/);
    await catalog.expectLoaded();
    await expect(catalog.accountTrigger("B-A")).toBeVisible();

    await catalog.signOut("B-A");
    await expect(page).toHaveURL(/\/login/);
    await login.expectLoaded();
  });

  test("invalid login shows one generic message and never reveals account existence", async ({ page }) => {
    const login = new LoginPage(page);
    const { borrower } = ACCOUNTS;

    await login.goto();
    await login.signInExpectingFailure({ username: borrower().username, password: "definitely-wrong" });
    const wrongPasswordMessage = await login.errorMessage().textContent();
    expect(wrongPasswordMessage).toContain("Invalid credentials.");
    // Username preserved, password cleared (f-01 §2.3).
    await expect(login.usernameField()).toHaveValue("B-A");
    await expect(login.passwordField()).toHaveValue("");

    await login.signInExpectingFailure({ username: "no-such-user", password: "whatever" });
    const unknownUserMessage = await login.errorMessage().textContent();
    // Identical wording for unknown user and wrong password (FR-01/AC-F01-02).
    expect(unknownUserMessage).toBe(wrongPasswordMessage);
  });

  test("a 401 during browsing clears stale state and returns to Login with a notice", async ({ page }) => {
    const login = new LoginPage(page);
    const catalog = new CatalogPage(page);

    await login.goto();
    await login.signIn(ACCOUNTS.borrower());
    await catalog.expectLoaded();

    // Simulate session expiry: drop the cookie, then make a later API call.
    await page.context().clearCookies();
    await catalog.itemLink("Synthetic single-unit fixture").click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Your session has expired. Please sign in again.")).toBeVisible();
    // No stale private data rendered on the login screen.
    await expect(page.getByText("Equipment Catalog")).toHaveCount(0);
  });
});
