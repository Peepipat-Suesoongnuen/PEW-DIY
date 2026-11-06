import { expect, test } from "@playwright/test";
import { ACCOUNTS, ITEMS } from "../pages/fixtures";
import { LoginPage } from "../pages/login.page";

test.describe("F-04 persisted borrowing requests", () => {
  test("multi-unit submit, reload, own detail, cross-owner denial and Custodian queue", async ({ page, browser }) => {
    const login = new LoginPage(page);
    await login.goto(); await login.signIn(ACCOUNTS.borrower());
    await page.goto(`/items/${encodeURIComponent(ITEMS.many.id)}`);
    await page.getByLabel("Quantity", { exact: true }).fill("3");
    const creation = page.waitForResponse((res) => res.url().endsWith("/api/requests") && res.request().method() === "POST");
    await page.getByRole("button", { name: "Submit request" }).click();
    const response = await creation;
    expect(response.status()).toBe(201);
    const created = (await response.json()).data as { id: string; status: string; quantity_requested: number };
    await expect(page).toHaveURL(/\/requests$/);
    await expect(page.getByText("Request submitted.")).toBeVisible();
    const detailPath = `/requests/${encodeURIComponent(created.id)}`;
    await page.reload();
    await expect(page.locator(`a[href="${detailPath}"]`)).toBeVisible();
    await page.goto(detailPath);
    await expect(page.getByRole("heading", { name: "Request details" })).toBeVisible();
    await expect(page.locator("dl")).toContainText("3");
    const stock = await page.request.get(`/api/equipment/${ITEMS.many.id}`);
    expect((await stock.json()).data.quantity_available).toBe(3);

    const second = await browser.newContext({ baseURL: new URL(page.url()).origin });
    try {
      const other = await second.newPage();
      const secondLogin = new LoginPage(other);
      await secondLogin.goto(); await secondLogin.signIn(ACCOUNTS.secondBorrower());
      const denied = await second.request.get(`/api/requests/${encodeURIComponent(created.id)}`);
      expect(denied.status()).toBe(403);
      expect(JSON.stringify(await denied.json())).not.toContain("borrower_id");
      await other.goto(detailPath);
      await expect(other.getByText("You do not have access to this request.")).toBeVisible();
    } finally { await second.close(); }

    const staff = await browser.newContext({ baseURL: new URL(page.url()).origin });
    try {
      const staffPage = await staff.newPage();
      const staffLogin = new LoginPage(staffPage);
      await staffLogin.goto(); await staffLogin.signIn(ACCOUNTS.custodian());
      await staffPage.goto("/requests");
      await expect(staffPage.getByRole("heading", { name: "Submitted requests" })).toBeVisible();
      await expect(staffPage.locator(`a[href="${detailPath}"]`)).toBeVisible();
      const denied = await staff.request.post("/api/requests", {
        headers: { Origin: new URL(staffPage.url()).origin }, data: { equipment_id: ITEMS.one.id, quantity_requested: 1 },
      });
      expect(denied.status()).toBe(403);
    } finally { await staff.close(); }
  });

  test("unavailable item has no submit form and rejects direct API requests", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto(); await login.signIn(ACCOUNTS.borrower());
    await page.goto(`/items/${ITEMS.zero.id}`);
    await expect(page.getByText("This item is currently unavailable.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit request" })).toHaveCount(0);
    const result = await page.request.post("/api/requests", {
      headers: { Origin: new URL(page.url()).origin }, data: { equipment_id: ITEMS.zero.id, quantity_requested: 1 },
    });
    expect(result.status()).toBe(409);
  });
});
