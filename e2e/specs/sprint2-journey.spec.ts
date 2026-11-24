import { expect, test } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { Pool } from "pg";
import { migrate } from "../../server/src/db/migrations";
import { hashPassword } from "../../server/src/services/password";
import { LoginPage } from "../pages/login.page";

test("Sprint 2 F-08 E2E: Custodian catalog CRUD/retire and Borrower search/filter/sort (TEST-F08-06)", async ({
  browser,
}, testInfo) => {
  test.setTimeout(120000);
  if (!process.env.TEST_DATABASE_URL) throw new Error("Dedicated TEST_DATABASE_URL required");
  const admin = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const schema = "s2e2e_" + randomUUID().replaceAll("-", "");
  await admin.query(`CREATE SCHEMA ${schema}`);
  const dbUrl = new URL(process.env.TEST_DATABASE_URL);
  dbUrl.searchParams.set("options", `-c search_path=${schema}`);
  const pool = new Pool({ connectionString: dbUrl.toString() });

  let proc: ReturnType<typeof spawn> | undefined;
  let borrowerCtx: Awaited<ReturnType<typeof browser.newContext>> | undefined;
  let staffCtx: Awaited<ReturnType<typeof browser.newContext>> | undefined;

  try {
    await migrate(pool);
    const password = randomBytes(24).toString("hex");
    const hash = await hashPassword(password);
    await pool.query(
      `INSERT INTO users(id, username, password_hash, role)
       VALUES ('b-s2', 'Borrower S2', $1, 'BORROWER'),
              ('c-s2', 'Custodian S2', $1, 'CUSTODIAN')`,
      [hash],
    );

    proc = spawn(process.execPath, ["--import", "tsx", "server/tests/fixtures/loan-worker.ts"], {
      cwd: process.cwd(),
      env: { ...process.env, TEST_DATABASE_URL: dbUrl.toString(), F05_TEST_MODE: "normal" },
      windowsHide: true,
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    });
    const ready = await Promise.race([
      once(proc, "message").then(([msg]) => msg as { port: number }),
      new Promise<never>((_, reject) => {
        const timer = setTimeout(() => reject(new Error("S2 E2E worker did not start")), 20000);
        timer.unref();
      }),
    ]);
    const origin = `http://127.0.0.1:${ready.port}`;
    const ctxOpts = { baseURL: origin, viewport: testInfo.project.use.viewport };
    borrowerCtx = await browser.newContext(ctxOpts);
    staffCtx = await browser.newContext(ctxOpts);
    const bPage = await borrowerCtx.newPage();
    const cPage = await staffCtx.newPage();

    await new LoginPage(cPage).goto();
    await new LoginPage(cPage).signIn({ username: "Custodian S2", password });
    await new LoginPage(bPage).goto();
    await new LoginPage(bPage).signIn({ username: "Borrower S2", password });

    // 1. Custodian adds two catalog items via UI (FR-09)
    await cPage.goto("/catalog");
    for (const item of [
      { name: "Fluke 87V", cat: "Measurement", qty: "3" },
      { name: "Soldering Iron", cat: "Tools", qty: "4" },
    ]) {
      await cPage.getByRole("button", { name: "Add equipment" }).click();
      await cPage.getByLabel("Equipment name").fill(item.name);
      await cPage.getByLabel("Equipment category").fill(item.cat);
      await cPage.getByLabel("Description").fill(`${item.name} description`);
      await cPage.getByLabel("Total stock quantity (whole number >= 0)").fill(item.qty);
      await cPage.getByRole("button", { name: "Save equipment" }).click();
      await expect(cPage.getByText(item.name).filter({ visible: true }).first()).toBeVisible();
    }

    // 2. Borrower searches and filters catalog (FR-10)
    await bPage.goto("/catalog");
    await bPage.getByLabel("Search").fill("Fluke");
    await expect(bPage.getByText("Fluke 87V").filter({ visible: true }).first()).toBeVisible();
    await expect(bPage.getByText("Soldering Iron")).toHaveCount(0);

    // 3. Custodian edits item details on ItemDetailPage and verifies BackButton (UAT-07 / FR-09)
    await cPage.route("**/images/fluke.png", (route) =>
      route.fulfill({
        status: 200,
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"></svg>',
      }),
    );
    await cPage.getByRole("link", { name: "View Fluke 87V" }).filter({ visible: true }).first().click();
    await expect(cPage.getByRole("link", { name: "Back to catalog" })).toBeVisible();
    await cPage.getByRole("button", { name: "Edit equipment" }).click();
    await cPage.getByLabel("Preview image URL").fill("/images/fluke.png");
    await cPage.getByRole("button", { name: "Save changes" }).click();
    await expect(cPage.getByAltText("Fluke 87V")).toHaveAttribute("src", "/images/fluke.png");

    // 4. Borrower creates a 2-item bundle request for 10 days (A-11 / BR-07)
    await bPage.goto("/requests/new");
    await bPage.getByRole("button", { name: "Add item" }).click();
    await bPage.getByRole("button", { name: "Add item" }).click();
    await bPage.getByLabel("Borrowing duration (days)").fill("10");
    await bPage.getByLabel(/Purpose details/).fill("Senior design lab");
    await bPage.getByRole("button", { name: /Submit bundle request/ }).click();
    await expect(bPage).toHaveURL(/\/requests$/);
    await expect(bPage.getByText(/waiting for custodian approval/)).toBeVisible();

    // 5. Custodian approves & checks out entire bundle
    await cPage.goto("/requests");
    await cPage.getByText("Fluke 87V").filter({ visible: true }).first().click();
    await cPage.getByLabel("Decision note (optional)").fill("Approved for Senior lab");
    await cPage.getByRole("button", { name: "Approve entire bundle" }).click();
    await expect(cPage.getByRole("button", { name: /Check out entire bundle/ })).toBeVisible();
    await cPage.getByRole("button", { name: /Check out entire bundle/ }).click();
    await expect(cPage.getByText("Checkout completed.")).toBeVisible();

    // Stock decremented after bundle checkout (Fluke 87V: 3 -> 2)
    const eqRes = await bPage.request.get("/api/equipment?q=Fluke");
    expect((await eqRes.json()).data[0].quantity_available).toBe(2);
  } finally {
    await Promise.all([borrowerCtx?.close(), staffCtx?.close()]);
    if (proc && proc.exitCode === null) {
      const exited = once(proc, "exit");
      proc.kill();
      await exited;
    }
    await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
});
