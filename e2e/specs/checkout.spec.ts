import { expect, test } from "@playwright/test";
import { randomBytes, randomUUID } from "crypto";
import { spawn } from "child_process";
import { once } from "events";
import { Pool } from "pg";
import { hashPassword } from "../../server/src/services/password";
import { migrate } from "../../server/src/db/migrations";
import { LoginPage } from "../pages/login.page";

// Every browser scenario owns its users/items, so parallel viewports cannot
// consume catalog fixtures or each other's stock. All responses use a real DB.
for (const mode of ["hold", "fail", "normal"] as const) {
  test(`F-05 ${mode}: real checkout, active loans and safe rejection (TEST-F05-12)`, async ({ browser }, testInfo) => {
    const databaseUrl = process.env.TEST_DATABASE_URL;
    if (!databaseUrl) throw new Error("TEST_DATABASE_URL is required for isolated checkout browser tests");
    const admin = new Pool({ connectionString: databaseUrl });
    const schema = "f05_e2e_" + randomUUID().replaceAll("-", "");
    await admin.query(`CREATE SCHEMA ${schema}`);
    const isolatedUrl = new URL(databaseUrl);
    isolatedUrl.searchParams.set("options", `-c search_path=${schema}`);
    const pool = new Pool({ connectionString: isolatedUrl.toString() });
    await migrate(pool);
    const prefix = "f05-e2e-" + randomUUID();
    const password = randomBytes(24).toString("hex");
    const accounts = ["a", "b", "c"].map((suffix) => ({ username: `${prefix}-${suffix}`, password }));
    const item = prefix + "-item";
    const proc = spawn(process.execPath, ["--import", "tsx", "server/tests/fixtures/loan-worker.ts"], {
      cwd: process.cwd(), env: { ...process.env, TEST_DATABASE_URL: isolatedUrl.toString(),
        F05_TEST_MODE: mode }, windowsHide: true, stdio: ["ignore", "ignore", "pipe", "ipc"],
    });
    const waitMessage = <T,>(predicate: (message: unknown) => boolean) => new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => { proc.off("message", listener); reject(new Error("Test worker message timed out")); }, 20000);
      const listener = (m: unknown) => { if (predicate(m)) { clearTimeout(timer); proc.off("message", listener); resolve(m as T); } };
      proc.on("message", listener); proc.once("error", reject);
    });
    let borrower: Awaited<ReturnType<typeof browser.newContext>> | undefined;
    let staff: Awaited<ReturnType<typeof browser.newContext>> | undefined;
    let other: Awaited<ReturnType<typeof browser.newContext>> | undefined;
    try {
      const { port } = await waitMessage<{ port: number }>((m) => typeof m === "object" && m !== null && "port" in m);
      const origin = `http://127.0.0.1:${port}`;
      for (const [i, account] of accounts.entries()) await pool.query("INSERT INTO users(id,username,password_hash,role) VALUES($1,$1,$2,$3)",
        [account.username, await hashPassword(password), i === 2 ? "CUSTODIAN" : "BORROWER"]);
      await pool.query("INSERT INTO equipment VALUES($1,'Checkout synthetic','Fixture','Synthetic',3)", [item]);
      const contextOptions = { baseURL: origin, viewport: testInfo.project.use.viewport };
      borrower = await browser.newContext(contextOptions); staff = await browser.newContext(contextOptions);
      const bPage = await borrower.newPage(), cPage = await staff.newPage();
      for (const [page, account] of [[bPage, accounts[0]!], [cPage, accounts[2]!]] as const) {
        const login = new LoginPage(page); await login.goto(); await login.signIn(account);
      }
      await bPage.goto("/loans"); await expect(bPage.getByText("No active loans.")).toBeVisible();
      await cPage.goto("/requests"); await expect(cPage.getByText("No submitted requests.")).toBeVisible();
      await bPage.goto(`/items/${encodeURIComponent(item)}`);
      await bPage.getByLabel("Quantity", { exact: true }).fill("2");
      const creation = bPage.waitForResponse((r) => r.url().endsWith("/api/requests") && r.request().method() === "POST");
      await bPage.getByRole("button", { name: "Submit request" }).click();
      const submitted = await creation; expect(submitted.status()).toBe(201);
      const requestId = (await submitted.json()).data.id as string;
      await cPage.goto(`/requests/${encodeURIComponent(requestId)}`);
      await expect(cPage.getByRole("button", { name: "Check out", exact: true })).toBeVisible();
      if (mode === "hold") {
        const inserted = waitMessage((m) => m === "barrier");
        await cPage.getByRole("button", { name: "Check out", exact: true }).click(); await inserted;
        try {
          await expect(cPage.getByRole("button", { name: "Checking out…" })).toBeDisabled();
          await expect(cPage.getByText("Checkout completed.")).toHaveCount(0);
          const stock = await borrower.request.get(`/api/equipment/${encodeURIComponent(item)}`);
          expect((await stock.json()).data.quantity_available).toBe(3);
          expect((await pool.query("SELECT * FROM loans WHERE request_id=$1", [requestId])).rowCount).toBe(0);
        } finally { proc.send("release"); }
        await expect(cPage.getByText("Checkout completed.")).toBeVisible();
        const committed = cPage.getByRole("main").locator("dl");
        await expect(committed.getByText(accounts[0]!.username, { exact: true })).toBeVisible();
        await expect(committed.getByText(accounts[2]!.username, { exact: true })).toHaveCount(0);
        const stored = (await pool.query("SELECT *,due_on::text AS due_date FROM loans WHERE request_id=$1", [requestId])).rows[0];
        await expect(cPage.getByText(stored.due_date, { exact: true })).toBeVisible();
        expect(stored.quantity_borrowed).toBe(2);
        await bPage.goto("/loans"); await expect(bPage.getByText(stored.id, { exact: true })).toBeVisible();
        await bPage.reload(); await expect(bPage.getByText(stored.id, { exact: true })).toBeVisible();
        expect((await (await borrower.request.get(`/api/equipment/${encodeURIComponent(item)}`)).json()).data.quantity_available).toBe(1);
        expect((await staff.request.post(`/api/requests/${requestId}/checkout`, { data: {}, headers: { Origin: origin } })).status()).toBe(409);
        other = await browser.newContext(contextOptions); const otherPage = await other.newPage();
        const otherLogin = new LoginPage(otherPage); await otherLogin.goto(); await otherLogin.signIn(accounts[1]!);
        expect((await other.request.get(`/api/loans/${stored.id}`)).status()).toBe(403);
        expect((await borrower.request.post(`/api/requests/${requestId}/checkout`, { data: {}, headers: { Origin: origin } })).status()).toBe(403);
      } else if (mode === "fail") {
        await cPage.getByRole("button", { name: "Check out", exact: true }).click();
        await expect(cPage.getByText(/Could not complete checkout/)).toBeVisible();
        await expect(cPage.getByText("Checkout completed.")).toHaveCount(0);
        expect((await pool.query("SELECT * FROM loans WHERE request_id=$1", [requestId])).rowCount).toBe(0);
        expect((await (await borrower.request.get(`/api/equipment/${encodeURIComponent(item)}`)).json()).data.quantity_available).toBe(3);
      } else {
        // A second request is stale after staff fulfills the first for two of
        // three units; actual server stock validation must reject its qty2.
        const stale = await borrower.request.post("/api/requests", { data: { equipment_id: item, quantity_requested: 2 }, headers: { Origin: origin } });
        expect(stale.status()).toBe(201); const staleId = (await stale.json()).data.id;
        await cPage.goto(`/requests/${encodeURIComponent(staleId)}`);
        await expect(cPage.getByRole("button", { name: "Check out", exact: true })).toBeVisible();
        expect((await staff.request.post(`/api/requests/${requestId}/checkout`, { data: {}, headers: { Origin: origin } })).status()).toBe(201);
        await cPage.getByRole("button", { name: "Check out", exact: true }).click();
        await expect(cPage.getByText(/This request cannot be checked out/)).toBeVisible();
        await expect(cPage.getByText("Checkout completed.")).toHaveCount(0);
        await cPage.getByRole("button", { name: "Refresh requests" }).click();
        await expect(cPage.getByRole("button", { name: "Check out", exact: true })).toBeEnabled();
        expect((await pool.query("SELECT * FROM loans WHERE request_id=$1", [staleId])).rowCount).toBe(0);
      }
      expect(await cPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    } finally {
      proc.send?.("release");
      await Promise.all([borrower?.close(), staff?.close(), other?.close()]);
      if (proc.exitCode === null) { const exited = once(proc, "exit"); proc.kill(); await exited; }
      await pool.query("DELETE FROM loans WHERE request_id IN (SELECT id FROM borrowing_requests WHERE equipment_id=$1)", [item]);
      await pool.query("DELETE FROM borrowing_requests WHERE equipment_id=$1", [item]);
      await pool.query("DELETE FROM equipment WHERE id=$1", [item]);
      await pool.query("DELETE FROM sessions WHERE user_id=ANY($1::text[])", [accounts.map((a) => a.username)]);
      await pool.query("DELETE FROM users WHERE id=ANY($1::text[])", [accounts.map((a) => a.username)]);
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  });
}
