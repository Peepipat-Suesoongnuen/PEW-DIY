import { expect, test } from "@playwright/test";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { Pool } from "pg";
import { ACCOUNTS } from "../pages/fixtures";
import { LoginPage } from "../pages/login.page";
import { CatalogPage } from "../pages/catalog.page";

test("TEST-F10-01/02: complete UI/API/DB journey, exclusive rejection, ownership and logout", async ({ page, browser }, testInfo) => {
  if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required for integrated verification");
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const item = "f10-browser-" + randomUUID();
  const name = "Integration exclusive fixture " + testInfo.project.name;
  const origin = new URL(testInfo.project.use.baseURL ?? process.env.E2E_BASE_URL ?? "http://localhost:3000").origin;
  const options = { baseURL: origin, viewport: testInfo.project.use.viewport };
  const staff = await browser.newContext(options), other = await browser.newContext(options);
  const cPage = await staff.newPage(), bPage = await other.newPage();
  const artifactDir = process.env.VERIFICATION_ARTIFACT_DIR;
  const shot = async (screen: typeof page, label: string) => {
    if (!artifactDir) return;
    await mkdir(path.join(artifactDir, "screenshots"), { recursive: true });
    await screen.screenshot({ path: path.join(artifactDir, "screenshots", `${testInfo.project.name}-${label}.png`), fullPage: true });
  };
  try {
    await pool.query("INSERT INTO equipment VALUES($1,$2,'Synthetic integrated journey','Synthetic',1)", [item, name]);
    const login = new LoginPage(page); await login.goto(); await login.signIn(ACCOUNTS.borrower());
    await page.goto("/catalog");
    await expect(page.locator(`a[aria-label="View ${name}"]:visible`).first()).toBeVisible();
    await page.locator(`a[aria-label="View ${name}"]:visible`).first().click();
    const creation = page.waitForResponse((r) => r.url().endsWith("/api/requests") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Submit request" }).click();
    const submitted = await creation; expect(submitted.status()).toBe(201);
    const requestId = (await submitted.json()).data.id;
    await page.goto(`/requests/${requestId}`); await page.reload();
    await expect(page.getByRole("heading", { name: "Request details" })).toBeVisible();
    await shot(page, "borrower-request");
    // Browser-local role tampering cannot change the authenticated principal.
    await page.evaluate(() => localStorage.setItem("role", "CUSTODIAN"));
    const me = await page.request.get("/api/auth/me"); expect(me.status()).toBe(200);
    expect((await me.json()).data.user.role).toBe("BORROWER");
    const forbiddenCheckout = await page.request.post(`/api/requests/${requestId}/checkout`, { data: {}, headers: { Origin: origin } });
    expect(forbiddenCheckout.status()).toBe(403);
    const otherLogin = new LoginPage(bPage); await otherLogin.goto(); await otherLogin.signIn(ACCOUNTS.secondBorrower());
    const second = await other.request.post("/api/requests", { data: { equipment_id: item, quantity_requested: 1 }, headers: { Origin: origin } });
    expect(second.status()).toBe(201); const secondId = (await second.json()).data.id;
    expect((await (await page.request.get(`/api/equipment/${item}`)).json()).data.quantity_available).toBe(1);
    // Complete logout/login lifecycle before changing actor contexts.
    const oldCookie = await page.context().cookies();
    await new CatalogPage(page).signOut("B-A"); await expect(page).toHaveURL(/\/login$/);
    await shot(page, "logout");
    const replay = await page.request.get("/api/auth/me", { headers: { Cookie: oldCookie.map((c) => `${c.name}=${c.value}`).join("; ") } });
    expect(replay.status()).toBe(401);
    const staffLogin = new LoginPage(cPage); await staffLogin.goto(); await staffLogin.signIn(ACCOUNTS.custodian());
    await cPage.goto("/requests");
    await expect(cPage.locator(`a[href="/requests/${requestId}"]`)).toBeVisible();
    await cPage.goto(`/requests/${requestId}`);
    const checked = cPage.waitForResponse((r) => r.url().endsWith(`/requests/${requestId}/checkout`));
    await cPage.getByRole("button", { name: "Check out", exact: true }).click();
    const checkout = await checked; expect(checkout.status()).toBe(201);
    const loan = (await checkout.json()).data;
    await expect(cPage.getByText("Checkout completed.")).toBeVisible(); await shot(cPage, "custodian-checkout");
    const stored = (await pool.query(`SELECT l.*,r.equipment_id,r.borrower_id,l.due_on::text AS due_date
      FROM loans l JOIN borrowing_requests r ON r.id=l.request_id WHERE l.id=$1`, [loan.id])).rows[0];
    expect(stored.request_id).toBe(requestId); expect(stored.quantity_borrowed).toBe(1);
    expect(stored.due_date).toBe(loan.due_on); expect(stored.borrower_id).toBe(loan.borrower_id);
    const repeated = await staff.request.post(`/api/requests/${requestId}/checkout`, { data: {}, headers: { Origin: origin } });
    expect(repeated.status()).toBe(409); expect((await repeated.json()).error.code).toBe("ALREADY_CHECKED_OUT");
    await cPage.goto(`/requests/${secondId}`); await cPage.getByRole("button", { name: "Check out", exact: true }).click();
    await expect(cPage.getByText(/This request cannot be checked out/)).toBeVisible(); await shot(cPage, "stock-rejection");
    await login.goto(); await login.signIn(ACCOUNTS.borrower());
    await page.goto(`/loans/${loan.id}`); await page.reload();
    await expect(page.getByText(loan.id, { exact: true })).toBeVisible(); await shot(page, "borrower-loan");
    await page.goto(`/items/${item}`);
    expect((await (await page.request.get(`/api/equipment/${item}`)).json()).data.quantity_available).toBe(0);
    await expect(page.getByRole("button", { name: "Submit request" })).toHaveCount(0);
    await shot(page, "availability-zero");
    expect((await other.request.get(`/api/requests/${requestId}`)).status()).toBe(403);
    expect((await other.request.get(`/api/loans/${loan.id}`)).status()).toBe(403);
    await bPage.goto(`/loans/${loan.id}`);
    await expect(bPage.getByText("You do not have access to this loan.")).toBeVisible(); await shot(bPage, "cross-owner-forbidden");
    expect((await pool.query("SELECT * FROM loans WHERE request_id=ANY($1::text[])", [[requestId, secondId]])).rowCount).toBe(1);
    if (artifactDir) await writeFile(path.join(artifactDir, `demo-${testInfo.project.name}.json`), JSON.stringify({
      test: "TEST-F10-01/02", project: testInfo.project.name, item, requestId, loanId: loan.id,
      due_on: loan.due_on, requestStatus: "CHECKED_OUT", quantity_available: 0,
      outcomes: { create: 201, checkout: 201, repeated: 409, unavailable: 409, borrowerCheckout: 403, crossOwner: 403, logoutReplay: 401 },
    }, null, 2) + "\n");
  } finally {
    await Promise.all([staff.close(), other.close()]);
    await pool.query("DELETE FROM loans WHERE request_id IN (SELECT id FROM borrowing_requests WHERE equipment_id=$1)", [item]);
    await pool.query("DELETE FROM borrowing_requests WHERE equipment_id=$1", [item]);
    await pool.query("DELETE FROM equipment WHERE id=$1", [item]); await pool.end();
  }
});
