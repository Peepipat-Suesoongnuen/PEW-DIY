import { expect, test } from "@playwright/test";
import { ACCOUNTS, ITEMS } from "../pages/fixtures";
import { CatalogPage } from "../pages/catalog.page";
import { ItemDetailPage } from "../pages/item.page";
import { LoginPage } from "../pages/login.page";

/**
 * catalog-journey (ARCH-01 §11): list → detail → back; both roles;
 * empty/missing states; responsive surfaces. Covers AC-F02-06 leg +
 * Issue #33 AC-5/6/7.
 */
test.describe("catalog journey", () => {
  test("list → detail → back keeps the same persisted item (Borrower)", async ({ page }) => {
    const login = new LoginPage(page);
    const catalog = new CatalogPage(page);
    const detail = new ItemDetailPage(page);

    await login.goto();
    await login.signIn(ACCOUNTS.borrower());
    await catalog.expectLoaded();

    await catalog.itemLink(ITEMS.one.name).click();
    await expect(page).toHaveURL(/\/items\/fixture-e-one/);
    await detail.expectInfo(ITEMS.one.name);
    await expect(detail.badge("AVAILABLE")).toBeVisible();

    await detail.backToCatalog();
  });

  test("Custodian sees the same catalog data without a Borrower request action", async ({ page }) => {
    const login = new LoginPage(page);
    const catalog = new CatalogPage(page);
    const detail = new ItemDetailPage(page);

    await login.goto();
    await login.signIn(ACCOUNTS.custodian());
    await catalog.expectLoaded();
    await expect(catalog.accountTrigger("C-A")).toBeVisible();

    await catalog.itemLink(ITEMS.zero.name).click();
    await detail.expectInfo(ITEMS.zero.name);
    await expect(detail.badge("UNAVAILABLE")).toBeVisible();
    // F-04 request panel belongs to #11 — UI-02 renders no request affordance.
    await expect(page.getByText("Request to borrow")).toHaveCount(0);
  });

  test("responsive surfaces match the viewport (AC-7 matrix)", async ({ page }) => {
    const login = new LoginPage(page);
    const catalog = new CatalogPage(page);

    await login.goto();
    await login.signIn(ACCOUNTS.borrower());
    await catalog.expectLoaded();

    const width = page.viewportSize()?.width ?? 1280;
    await catalog.expectResponsiveSurfaces(width);
  });

  test("a missing item shows the missing state with a way back", async ({ page }) => {
    const login = new LoginPage(page);
    const detail = new ItemDetailPage(page);

    await login.goto();
    await login.signIn(ACCOUNTS.borrower());
    await detail.goto("does-not-exist");

    await expect(detail.missingMessage()).toBeVisible();
    await detail.backToCatalog();
  });
});
