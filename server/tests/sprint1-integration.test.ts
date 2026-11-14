import { createHash, randomBytes, randomUUID } from "crypto";
import { spawn, type ChildProcess } from "child_process";
import { once } from "events";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { createTestContext, PROTECTED_ROUTE_INVENTORY } from "./harness";
import { PROTECTED_ROUTES } from "../src/services/authz";
import { SessionStore } from "../src/services/session";
import { hashPassword } from "../src/services/password";
import request from "supertest";
import { createApp } from "../src/routes/auth-routes";
import { AuthService } from "../src/services/auth";
import { configForTests } from "./harness";

const origin = "http://127.0.0.1:3168";
const prefix = "f10-" + randomUUID();
const ids = [prefix + "-a", prefix + "-b", prefix + "-c"];
const password = randomBytes(24).toString("hex");
const item = prefix + "-item";
let pool: Pool, child: ChildProcess | undefined;
let cookies: string[], expired: string, revoked: string, requestId: string, loanId: string;

async function start() {
  child = spawn(process.execPath, ["--import", "tsx", "server/src/index.ts"], {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL!, PORT: "3168", APP_ORIGIN: origin,
      APP_TIMEZONE: "Asia/Bangkok", SESSION_COOKIE_NAME: "pew_session", SESSION_COOKIE_SECURE: "false" },
    stdio: "ignore", windowsHide: true,
  });
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline && child.exitCode === null) {
    try { if ((await fetch(origin + "/login.html")).ok) return; } catch { /* startup */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("F10 production application startup timed out");
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  const exited = once(child, "exit"); child.kill(); await exited; child = undefined;
}
async function call(method: string, path: string, cookie = "", body?: unknown) {
  return fetch(origin + path, { method, headers: { Origin: origin, Cookie: cookie, "Content-Type": "application/json" },
    ...(method === "GET" ? {} : { body: JSON.stringify(body ?? {}) }) });
}
async function login(index: number) {
  const response = await call("POST", "/api/auth/login", "", { username: ids[index], password });
  expect(response.status).toBe(200);
  return response.headers.get("set-cookie")!.split(";")[0]!;
}
const routePath = (path: string) => path.replace("fixture-e-one", encodeURIComponent(item))
  .replace("fixture-r-one", requestId).replace("fixture-loan", loanId);
const domain = async () => (await pool.query(`SELECT r.id,r.borrower_id,r.equipment_id,r.quantity_requested,
  r.created_at,l.id AS loan_id,l.quantity_borrowed,l.checked_out_by,l.checkout_at,l.due_on::text
  FROM borrowing_requests r LEFT JOIN loans l ON l.request_id=r.id WHERE r.equipment_id=$1 ORDER BY r.id`, [item])).rows;

beforeAll(async () => {
  ({ pool } = await createTestContext());
  for (const [index, id] of ids.entries()) await pool.query("INSERT INTO users(id,username,password_hash,role) VALUES($1,$1,$2,$3)",
    [id, await hashPassword(password), index === 2 ? "CUSTODIAN" : "BORROWER"]);
  await pool.query("INSERT INTO equipment VALUES($1,'Integration exclusive fixture','Synthetic','Synthetic',1)", [item]);
  await start(); cookies = await Promise.all(ids.map((_, i) => login(i)));
  const response = await call("POST", "/api/requests", cookies[0], { equipment_id: item, quantity_requested: 1 });
  expect(response.status).toBe(201); requestId = (await response.json()).data.id;
  const checkout = await call("POST", `/api/requests/${requestId}/checkout`, cookies[2]);
  expect(checkout.status).toBe(201); loanId = (await checkout.json()).data.id;
  const sessions = new SessionStore(pool, 60, 480);
  const stale = await sessions.create(ids[0]!);
  expired = `pew_session=${stale.rawId}`;
  await pool.query("UPDATE sessions SET expires_at=now()-interval '1 second' WHERE session_key=$1", [createHash("sha256").update(stale.rawId).digest("hex")]);
  const old = await sessions.create(ids[0]!); revoked = `pew_session=${old.rawId}`; await sessions.revoke(old.rawId);
});
afterAll(async () => {
  await stop(); if (!pool) return;
  await pool.query("DELETE FROM loans WHERE request_id IN (SELECT id FROM borrowing_requests WHERE equipment_id=$1)", [item]);
  await pool.query("DELETE FROM borrowing_requests WHERE equipment_id=$1", [item]);
  await pool.query("DELETE FROM equipment WHERE id=$1", [item]);
  await pool.query("DELETE FROM sessions WHERE user_id=ANY($1::text[])", [ids]);
  await pool.query("DELETE FROM users WHERE id=ANY($1::text[])", [ids]); await pool.end();
});

describe("F10 complete protected-route inventory on production HTTP/real DB", () => {
  it("keeps the HTTP probe inventory complete against the protected role matrix", () => {
    const normalized = PROTECTED_ROUTE_INVENTORY.map((r) => `${r.method} ${r.path.replace('fixture-e-one', '{equipmentId}').replace('fixture-r-one', '{requestId}').replace('fixture-loan', '{loanId}')}`).sort();
    expect(normalized).toEqual(PROTECTED_ROUTES.map((r) => `${r.method} ${r.path}`).sort());
  });
  it("configured HTTPS cookies have Secure/HttpOnly/SameSite attributes (TEST-F01-15)", async () => {
    const config = configForTests();
    config.session.cookieSecure = true;
    const app = createApp({ config, auth: new AuthService(pool, new SessionStore(pool, 60, 480)) });
    const response = await request(app).post("/api/auth/login").set("Origin", config.appOrigin).send({ username: ids[0], password });
    expect(response.status).toBe(200);
    const cookie = response.headers["set-cookie"][0];
    // Assert attributes individually, so a failure does not print raw tokens.
    expect(cookie.includes("; Secure")).toBe(true); expect(cookie.includes("; HttpOnly")).toBe(true); expect(cookie.includes("; SameSite=Lax")).toBe(true);
  });
  it("actual seed reruns preserve existing requests, loans, stock and identities (TEST-F02-05 complete)", async () => {
    const snapshot = await domain();
    const usersBefore = (await pool.query("SELECT id,username,role FROM users WHERE id=ANY($1::text[]) ORDER BY id", [ids])).rows;
    async function seed() {
      const proc = spawn(process.execPath, ["--import", "tsx", "server/src/db/seed.ts"], {
        env: { ...process.env, NODE_ENV: "test", DATABASE_URL: process.env.TEST_DATABASE_URL!, SEED_PASSWORD_BA: password, SEED_PASSWORD_BB: password, SEED_PASSWORD_CA: password },
        stdio: "ignore", windowsHide: true,
      });
      const [code] = await once(proc, "exit"); expect(code).toBe(0);
    }
    await seed();
    const equipmentBefore = (await pool.query("SELECT * FROM equipment ORDER BY id")).rows;
    const identityDigest = async () => createHash("sha256").update(JSON.stringify((await pool.query("SELECT * FROM users ORDER BY id")).rows)).digest("hex");
    const identities = await identityDigest();
    await seed();
    expect(await domain()).toEqual(snapshot);
    expect((await pool.query("SELECT * FROM equipment ORDER BY id")).rows).toEqual(equipmentBefore);
    expect((await pool.query("SELECT id,username,role FROM users WHERE id=ANY($1::text[]) ORDER BY id", [ids])).rows).toEqual(usersBefore);
    expect(await identityDigest()).toBe(identities);
  });
  for (const state of ["anonymous", "invalid", "expired", "revoked"] as const) {
    it.each(PROTECTED_ROUTE_INVENTORY)(`${state} $method $path denies without domain writes (TEST-F10-02 / TEST-F01-05/06/08)`, async (route) => {
      const before = await domain();
      const cookie = state === "anonymous" ? "" : state === "invalid" ? "pew_session=invalid-session" : state === "expired" ? expired : revoked;
      const response = await call(route.method, routePath(route.path), cookie, route.sampleBody);
      expect(response.status).toBe(401);
      const body = await response.json(); expect(body.data).toBeUndefined();
      expect(body.error.code).toBe("UNAUTHENTICATED"); expect(await domain()).toEqual(before);
    });
  }
  it.each(PROTECTED_ROUTES.filter((r) => r.allowedRoles.length === 1))("wrong role $method $path is forbidden by server (TEST-F10-02)", async (route) => {
    const before = await domain();
    const path = route.path.replace("{requestId}", requestId).replace("{loanId}", loanId);
    const wrongRole = route.allowedRoles[0] === "CUSTODIAN" ? cookies[0] : cookies[2];
    const response = await call(route.method, path, wrongRole, { equipment_id: item, quantity_requested: 1 });
    expect(response.status).toBe(403); expect((await response.json()).data).toBeUndefined(); expect(await domain()).toEqual(before);
  });
  it("owner query tampering cannot widen request/loan scope (TEST-F10-02 / TEST-F01-10)", async () => {
    for (const path of ["/api/requests", "/api/loans"]) {
      const response = await call("GET", `${path}?borrower_id=${ids[0]}&role=CUSTODIAN`, cookies[1]);
      expect(response.status).toBe(200); expect((await response.json()).data).toEqual([]);
    }
    for (const path of [`/api/requests/${requestId}`, `/api/loans/${loanId}`]) {
      const response = await call("GET", path, cookies[1]); expect(response.status).toBe(403);
      expect(JSON.stringify(await response.json())).not.toContain(ids[0]);
    }
  });
  it("restart preserves all domain fields, stock and revocation; reauthentication retrieves own data (TEST-F10-03 / TEST-F01-16)", async () => {
    const snapshot = await domain();
    const before = await (await call("GET", `/api/equipment/${encodeURIComponent(item)}`, cookies[0])).json();
    const logout = await call("POST", "/api/auth/logout", cookies[0]); expect(logout.status).toBe(204);
    const loggedOut = cookies[0]!;
    await stop(); await start();
    for (const route of PROTECTED_ROUTE_INVENTORY) {
      expect((await call(route.method, routePath(route.path), loggedOut, route.sampleBody)).status).toBe(401);
    }
    cookies[0] = await login(0);
    expect(await domain()).toEqual(snapshot);
    expect(await (await call("GET", `/api/equipment/${encodeURIComponent(item)}`, cookies[0])).json()).toEqual(before);
    expect((await (await call("GET", `/api/requests/${requestId}`, cookies[0])).json()).data.status).toBe("CHECKED_OUT");
    expect((await (await call("GET", `/api/loans/${loanId}`, cookies[0])).json()).data.id).toBe(loanId);
  }, 30000);
});
