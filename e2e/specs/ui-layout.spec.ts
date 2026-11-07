import { expect, test } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { Pool } from "pg";
import { migrate } from "../../server/src/db/migrations";
import { hashPassword } from "../../server/src/services/password";
import { LoginPage } from "../pages/login.page";

test("Issue39: stable navigation, separated loan actions, edge clicks and readable names", async ({ browser }, testInfo) => {
  test.setTimeout(90000);
  if (!process.env.TEST_DATABASE_URL) throw new Error("Dedicated TEST_DATABASE_URL required");
  const admin = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const schema = "ui39_" + randomUUID().replaceAll("-", "");
  await admin.query(`CREATE SCHEMA ${schema}`);
  const url = new URL(process.env.TEST_DATABASE_URL); url.searchParams.set("options", `-c search_path=${schema}`);
  const pool = new Pool({ connectionString: url.toString() });
  let worker: ReturnType<typeof spawn> | undefined;
  let context: Awaited<ReturnType<typeof browser.newContext>> | undefined;
  const measurements: unknown[] = [];
  try {
    await migrate(pool);
    const password = randomBytes(24).toString("hex"), passwordHash = await hashPassword(password);
    const borrowerId = "internal-borrower-" + randomUUID(), equipmentId = "internal-equipment-" + randomUUID();
    await pool.query("INSERT INTO users(id,username,password_hash,role) VALUES($1,'Student A',$2,'BORROWER'),('internal-staff','Layout staff',$2,'CUSTODIAN')", [borrowerId, passwordHash]);
    await pool.query("INSERT INTO equipment VALUES($1,'Synthetic Tool Set','Layout fixture','Synthetic',20)", [equipmentId]);
    worker = spawn(process.execPath, ["--import", "tsx", "server/tests/fixtures/loan-worker.ts"], {
      cwd: process.cwd(), env: { ...process.env, TEST_DATABASE_URL: url.toString(), F05_TEST_MODE: "normal" },
      windowsHide: true, stdio: ["ignore", "ignore", "ignore", "ipc"],
    });
    const ready = await Promise.race([
      once(worker, "message").then(([message]) => message as { port: number }),
      new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error("Layout app did not start")), 20000); timer.unref(); }),
    ]);
    const origin = `http://127.0.0.1:${ready.port}`;
    context = await browser.newContext({ baseURL: origin, viewport: testInfo.project.use.viewport });
    const page = await context.newPage();
    const login = new LoginPage(page); await login.goto(); await login.signIn({ username: "Student A", password });
    const staff = await browser.newContext({ baseURL: origin });
    let loanId = "";
    try {
      expect((await staff.request.post("/api/auth/login", { data: { username: "Layout staff", password }, headers: { Origin: origin } })).status()).toBe(200);
      for (let i = 0; i < 8; i++) {
        const request = await context.request.post("/api/requests", { data: { equipment_id: equipmentId, quantity_requested: 1 }, headers: { Origin: origin } });
        expect(request.status()).toBe(201);
        const checkout = await staff.request.post(`/api/requests/${(await request.json()).data.id}/checkout`, { data: {}, headers: { Origin: origin } });
        expect(checkout.status()).toBe(201); loanId = (await checkout.json()).data.id;
      }
    } finally { await staff.close(); }
    const projectWidth = testInfo.project.use.viewport!.width;
    // The standard three projects cover390/768/1280; desktop also checks1024.
    for (const width of projectWidth === 1280 ? [1280, 1024] : [projectWidth]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : width === 768 ? 1024 : 800 });
      const positions: { path: string; navX: number; mainX: number; scrolls: boolean }[] = [];
      for (const [route, heading] of [["/catalog", "Equipment Catalog"], ["/loans", "My active loans"], [`/loans/${loanId}`, "Loan details"], ["/requests", "My requests"], [`/items/${equipmentId}`, "Synthetic Tool Set"]]) {
        await page.goto(route!);
        const main = page.getByRole("main");
        await expect(main.getByRole("heading", { name: heading!, exact: true })).toBeVisible();
        await expect(main.getByText("Synthetic Tool Set", { exact: true }).filter({ visible: true }).first()).toBeVisible();
        const position = await page.evaluate(() => ({
          navX: document.querySelector('nav[aria-label="Main"] a')!.getBoundingClientRect().x,
          mainX: document.querySelector("main")!.getBoundingClientRect().x,
          scrolls: document.documentElement.scrollHeight > document.documentElement.clientHeight,
        }));
        positions.push({ path: route!, ...position });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      }
      expect(positions.some((p) => p.scrolls)).toBe(true);
      expect(positions.some((p) => !p.scrolls)).toBe(true);
      expect(Math.max(...positions.map((p) => p.navX)) - Math.min(...positions.map((p) => p.navX))).toBeLessThanOrEqual(1);
      expect(Math.max(...positions.map((p) => p.mainX)) - Math.min(...positions.map((p) => p.mainX))).toBeLessThanOrEqual(1);
      // Headless/overlay-scrollbar platforms must also reserve a stable gutter.
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarGutter)).toContain("stable");
      await page.goto(`/loans/${loanId}`);
      const details = page.getByRole("main").locator("dl");
      await expect(details.getByText("Synthetic Tool Set", { exact: true })).toBeVisible();
      await expect(details.getByText("Student A", { exact: true })).toBeVisible();
      await expect(details.getByText(borrowerId, { exact: true })).toHaveCount(0);
      await expect(details.getByText(equipmentId, { exact: true })).toHaveCount(0);
      const back = await page.getByRole("link", { name: "Back to my loans" }).boundingBox();
      const refresh = page.getByRole("button", { name: "Refresh loans" });
      const button = await refresh.boundingBox();
      expect(back).not.toBeNull(); expect(button).not.toBeNull();
      const gap = Math.max(button!.x - back!.x - back!.width, back!.x - button!.x - button!.width,
        button!.y - back!.y - back!.height, back!.y - button!.y - button!.height);
      expect(gap).toBeGreaterThanOrEqual(12);
      if (width === 390 || width === 1280) await testInfo.attach(`loan-details-${width}`, {
        body: await page.screenshot({ fullPage: true }), contentType: "image/png",
      });
      for (const fraction of [0.01, 0.1, 0.5, 0.9, 0.99]) {
        const box = (await refresh.boundingBox())!;
        const point = { x: box.x + box.width * fraction, y: box.y + box.height / 2 };
        expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("button")?.textContent, point)).toBe("Refresh loans");
        await Promise.all([
          page.waitForResponse((r) => r.url().endsWith(`/api/loans/${loanId}`) && r.request().method() === "GET" && r.status() === 200),
          page.mouse.click(point.x, point.y),
        ]);
        await expect(page).toHaveURL(`${origin}/loans/${loanId}`);
        await expect(details.getByText("Synthetic Tool Set", { exact: true })).toBeVisible();
      }
      await page.getByRole("link", { name: "Back to my loans" }).click();
      await expect(page).toHaveURL(`${origin}/loans`);
      measurements.push({ width, positions, actionGap: gap, refreshClickFractions: [0.01, 0.1, 0.5, 0.9, 0.99] });
    }
    await testInfo.attach("issue39-layout-measurements", { body: JSON.stringify(measurements, null, 2), contentType: "application/json" });
  } finally {
    await context?.close();
    if (worker && worker.exitCode === null) { const exited = once(worker, "exit"); worker.kill(); await exited; }
    await pool.end();
    if (!/^ui39_[a-f0-9]{32}$/.test(schema)) throw new Error("Unsafe schema cleanup");
    await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end();
  }
});
