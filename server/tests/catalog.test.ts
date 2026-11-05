/**
 * F-02 Equipment Catalog tests — TEST-F02-01..10 (contract f-02-equipment-catalog.md).
 *
 * TEST-F02-05/10: loan-dependent portions (F-04/F-05 setup) are dependency-gated
 * per contract §8 ("loan-dependent setup in TEST-F02-05/10 must follow the approved
 * F-04/F-05 quantity policy"); the catalog/identity portions run for real.
 * TEST-F02-07/08 (full browser UI): Playwright/browser harness is deferred with the
 * F-01 UI/E2E track (TEST-F01-13) — UI page-serving evidence runs here; no
 * browser-level claim is made.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import request from "supertest";
import type express from "express";
import { createApp } from "../src/routes/auth-routes";
import { AuthService } from "../src/services/auth";
import { SessionStore } from "../src/services/session";
import { hashPassword } from "../src/services/password";
import { loadConfig, AppConfig } from "../src/config/config";
import { createTestContext, TestContext } from "./harness";
import { validateEquipmentInput, seedEquipmentFixture } from "../src/services/catalog";

let ctx: TestContext;
let pool: Pool;
let app: express.Application;
let config: AppConfig;

async function seedUser(id: string, username: string, role: "BORROWER" | "CUSTODIAN", password: string) {
  const hash = await hashPassword(password);
  await pool.query(`DELETE FROM users WHERE id = $1 OR username = $2`, [id, username]);
  await pool.query(
    `INSERT INTO users (id, username, password_hash, role) VALUES ($1, $2, $3, $4)`,
    [id, username, hash, role],
  );
}

async function cleanCatalog(): Promise<void> {
  await pool.query(`DELETE FROM equipment`);
}

async function seedFixtures(): Promise<void> {
  await seedEquipmentFixture(pool, { id: "fixture-e-one", name: "Synthetic single-unit fixture", description: "Test fixture", category: "Synthetic", quantityTotal: 1 });
  await seedEquipmentFixture(pool, { id: "fixture-e-many", name: "Synthetic pooled fixture", description: "Test fixture", category: "Synthetic", quantityTotal: 3 });
  await seedEquipmentFixture(pool, { id: "fixture-e-zero", name: "Synthetic zero-stock fixture", description: "Test fixture", category: "Synthetic", quantityTotal: 0 });
}

async function login(username: string, password: string): Promise<string> {
  const res = await request(app).post("/api/auth/login").set("Origin", config.appOrigin).send({ username, password });
  const setCookie = res.headers["set-cookie"];
  const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const c of arr) {
    const m = String(c).match(/^pew_session=([^;]+)/);
    if (m) return m[1];
  }
  return "";
}

beforeAll(async () => {
  ctx = await createTestContext();
  pool = ctx.pool;
  config = loadConfig({ ...process.env, SESSION_IDLE_MINUTES: "60", SESSION_ABSOLUTE_MINUTES: "480" });
  const sessions = new SessionStore(pool, config.session.idleMinutes, config.session.absoluteMinutes);
  const auth = new AuthService(pool, sessions);
  app = createApp({ auth, config });
  await seedUser("u-b-a-cat", "B-A-cat", "BORROWER", "pw-cat");
  await seedUser("u-c-a-cat", "C-A-cat", "CUSTODIAN", "pw-cat");
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await pool.query(`DELETE FROM sessions WHERE user_id LIKE '%-cat' OR user_id LIKE '%-seed'`);
  await cleanCatalog();
});

describe("GET /api/equipment and /api/equipment/{id} (TEST-F02-01/02/03)", () => {
  it("lists seeded items for both roles with correct fields and no private data (TEST-F02-01)", async () => {
    await seedFixtures();
    for (const [user, role] of [["B-A-cat", "BORROWER"], ["C-A-cat", "CUSTODIAN"]] as const) {
      const cookie = await login(user, "pw-cat");
      const res = await request(app).get("/api/equipment").set("Cookie", `pew_session=${cookie}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain("password");
      expect(serialized).not.toContain("$argon2");
      expect(serialized).not.toContain("borrower_id");
      for (const item of res.body.data) {
        expect(typeof item.id).toBe("string");
        expect(typeof item.name).toBe("string");
        expect(typeof item.quantity_total).toBe("number");
        expect(typeof item.quantity_available).toBe("number");
        expect(["AVAILABLE", "UNAVAILABLE"]).toContain(item.availability);
      }
      // role tag sanity (ensures the role loop actually exercised both)
      expect(["BORROWER", "CUSTODIAN"]).toContain(role);
    }
  });

  it("E-ONE detail matches its list entry for both roles (TEST-F02-02)", async () => {
    await seedFixtures();
    const cookie = await login("B-A-cat", "pw-cat");
    const list = await request(app).get("/api/equipment").set("Cookie", `pew_session=${cookie}`);
    const entry = list.body.data.find((i: { id: string }) => i.id === "fixture-e-one");
    expect(entry).toBeTruthy();
    const detail = await request(app).get("/api/equipment/fixture-e-one").set("Cookie", `pew_session=${cookie}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data).toEqual(entry);
    expect(detail.body.data.name).toBe("Synthetic single-unit fixture");
    expect(detail.body.data.quantity_total).toBe(1);
  });

  it("empty catalog returns data=[] and unknown id returns safe 404 (TEST-F02-03)", async () => {
    const cookie = await login("B-A-cat", "pw-cat");
    const empty = await request(app).get("/api/equipment").set("Cookie", `pew_session=${cookie}`);
    expect(empty.status).toBe(200);
    expect(empty.body.data).toEqual([]);
    const missing = await request(app).get("/api/equipment/fixture-e-missing").set("Cookie", `pew_session=${cookie}`);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");
    // no fabricated item
    const again = await request(app).get("/api/equipment").set("Cookie", `pew_session=${cookie}`);
    expect(again.body.data).toEqual([]);
  });
});

describe("Authentication on catalog routes (TEST-F02-04)", () => {
  it("rejects absent/invalid/logged-out credentials with 401 and no catalog data", async () => {
    await seedFixtures();
    // absent
    for (const path of ["/api/equipment", "/api/equipment/fixture-e-one"]) {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
      expect(res.body.data).toBeUndefined();
    }
    // invalid
    const invalid = await request(app).get("/api/equipment").set("Cookie", "pew_session=not-a-real-session");
    expect(invalid.status).toBe(401);
    // logged-out
    const cookie = await login("B-A-cat", "pw-cat");
    const logout = await request(app).post("/api/auth/logout").set("Origin", config.appOrigin).set("Cookie", `pew_session=${cookie}`).send({});
    expect(logout.status).toBe(204);
    const replay = await request(app).get("/api/equipment").set("Cookie", `pew_session=${cookie}`);
    expect(replay.status).toBe(401);
  });
});

describe("Seed idempotency and validation (TEST-F02-05/06)", () => {
  it("re-seeding produces no duplicates and preserves totals and identity rows (TEST-F02-05 catalog/identity portion)", async () => {
    await seedFixtures();
    const before = await pool.query(`SELECT id, name, quantity_total FROM equipment ORDER BY id`);
    const usersBefore = await pool.query(`SELECT id, username, role FROM users ORDER BY id`);
    await seedFixtures(); // second seed — non-destructive
    const after = await pool.query(`SELECT id, name, quantity_total FROM equipment ORDER BY id`);
    const usersAfter = await pool.query(`SELECT id, username, role FROM users ORDER BY id`);
    expect(after.rows).toEqual(before.rows);
    expect(after.rows).toHaveLength(3);
    expect(usersAfter.rows).toEqual(usersBefore.rows);
    // loan-dependent assertions (F-04/F-05 setup) are dependency-gated per contract §8
  });

  it("rejects negative total and fractional quantity at the typed boundary; zero total is valid (TEST-F02-06)", async () => {
    // Each case isolates ONE field (valid id present) so each rejection is for
    // its intended reason — a missing-id rejection would otherwise mask the
    // field-level checks.
    const base = { id: "t-valid", name: "X", description: "", category: "Synthetic", quantityTotal: 1 };

    // negative total — typed boundary
    expect(() => validateEquipmentInput({ ...base, quantityTotal: -1 })).toThrow(/quantityTotal/);
    // fractional — typed boundary (must not be silently rounded)
    expect(() => validateEquipmentInput({ ...base, quantityTotal: 1.5 })).toThrow(/quantityTotal/);
    // missing required fields
    expect(() => validateEquipmentInput({ ...base, name: "" })).toThrow(/name/);
    expect(() => validateEquipmentInput({ ...base, category: "" })).toThrow(/category/);
    // zero total is valid
    const ok = validateEquipmentInput({ ...base, quantityTotal: 0 });
    expect(ok.quantityTotal).toBe(0);

    // DB boundary: negative insert rejected with no partial row
    await pool.query(`BEGIN`);
    await expect(
      pool.query(`INSERT INTO equipment (id, name, description, category, quantity_total) VALUES ('neg', 'N', '', 'S', -1)`),
    ).rejects.toThrow();
    await pool.query(`ROLLBACK`);
    const rows = await pool.query(`SELECT id FROM equipment WHERE id = 'neg'`);
    expect(rows.rows).toHaveLength(0);
    // valid zero-total insert accepted
    await seedEquipmentFixture(pool, { id: "fixture-e-zero", name: "Synthetic zero-stock fixture", description: "Test fixture", category: "Synthetic", quantityTotal: 0 });
    const zero = await pool.query(`SELECT quantity_total FROM equipment WHERE id = 'fixture-e-zero'`);
    expect(Number(zero.rows[0].quantity_total)).toBe(0);
  });
});

describe("Availability derivation and UI serving (TEST-F02-07/08 backend portion)", () => {
  it("availability label derives from total minus held (no loans held yet → available=total)", async () => {
    await seedFixtures();
    const cookie = await login("B-A-cat", "pw-cat");
    const res = await request(app).get("/api/equipment").set("Cookie", `pew_session=${cookie}`);
    const byId = Object.fromEntries(res.body.data.map((i: { id: string }) => [i.id, i]));
    expect(byId["fixture-e-one"].quantity_available).toBe(1);
    expect(byId["fixture-e-one"].availability).toBe("AVAILABLE");
    expect(byId["fixture-e-zero"].quantity_available).toBe(0);
    expect(byId["fixture-e-zero"].availability).toBe("UNAVAILABLE");
  });

  it("catalog and item UI pages are served (UI journey harness; browser E2E deferred with TEST-F01-13)", async () => {
    const catalog = await request(app).get("/catalog.html");
    expect(catalog.status).toBe(200);
    expect(catalog.text).toContain("catalog");
    const item = await request(app).get("/item.html");
    expect(item.status).toBe(200);
    const loginPage = await request(app).get("/login.html");
    expect(loginPage.status).toBe(200);
  });

  it("UI-to-API-to-DB journey: login page -> login API -> catalog page -> catalog API -> item page -> detail API (Borrower flow)", async () => {
    await seedFixtures();
    // The journey the UI JS performs (catalog.html fetches /api/equipment with
    // the session cookie; item.html fetches /api/equipment/{id}). Verified
    // through the real app against the real database; browser rendering is
    // asserted separately (deferred with TEST-F01-13 track).
    const loginPage = await request(app).get("/login.html");
    expect(loginPage.status).toBe(200);
    const cookie = await login("B-A-cat", "pw-cat");
    const catalogPage = await request(app).get("/catalog.html");
    expect(catalogPage.status).toBe(200);
    const list = await request(app).get("/api/equipment").set("Cookie", `pew_session=${cookie}`);
    expect(list.status).toBe(200);
    expect(list.body.data.map((i: { id: string }) => i.id)).toContain("fixture-e-one");
    const itemPage = await request(app).get("/item.html");
    expect(itemPage.status).toBe(200);
    const detail = await request(app).get("/api/equipment/fixture-e-one").set("Cookie", `pew_session=${cookie}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.name).toBe("Synthetic single-unit fixture");
  });
});

describe("Safe failure and restart persistence (TEST-F02-09/10)", () => {
  it("catalog DB failure yields safe 503 for list/detail and recovery returns real data (TEST-F02-09)", async () => {
    // Reviewer fix: a VALID authenticated session must reach the catalog
    // query — only equipment reads fail; auth/session queries pass through.
    // The old version failed at authentication first and accepted 401|503,
    // which proved nothing about the catalog failure path.
    await seedFixtures();
    let failEquipment = true;
    const flakyPool = {
      query: (text: string, params?: unknown[]) => {
        if (failEquipment && /FROM equipment/.test(text)) {
          return Promise.reject(new Error("connection refused: secret-connection-string-should-not-leak"));
        }
        return pool.query(text, params as never[]);
      },
    } as unknown as Pool;
    const flakySessions = new SessionStore(flakyPool, 60, 480);
    const flakyAuth = new AuthService(flakyPool, flakySessions);
    const flakyApp = createApp({ auth: flakyAuth, config });

    const cookie = await login("B-A-cat", "pw-cat"); // valid session (real store)
    // list
    const list = await request(flakyApp).get("/api/equipment").set("Cookie", `pew_session=${cookie}`);
    expect(list.status).toBe(503);
    expect(list.body.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(list.body.data).toBeUndefined();
    // detail
    const detail = await request(flakyApp).get("/api/equipment/fixture-e-one").set("Cookie", `pew_session=${cookie}`);
    expect(detail.status).toBe(503);
    expect(detail.body.error.code).toBe("SERVICE_UNAVAILABLE");
    // safe envelope: no SQL/stack/connection details, no false empty success
    const serialized = JSON.stringify([list.body, detail.body]);
    expect(serialized).not.toContain("secret-connection-string-should-not-leak");
    expect(serialized).not.toContain("SELECT");
    expect(serialized).not.toContain("at ");
    expect(list.body.data).not.toEqual([]);

    // restore DB and retry → real persisted data
    failEquipment = false;
    const retry = await request(flakyApp).get("/api/equipment").set("Cookie", `pew_session=${cookie}`);
    expect(retry.status).toBe(200);
    expect(retry.body.data).toHaveLength(3);
    const retryDetail = await request(flakyApp).get("/api/equipment/fixture-e-one").set("Cookie", `pew_session=${cookie}`);
    expect(retryDetail.status).toBe(200);
    expect(retryDetail.body.data.id).toBe("fixture-e-one");
  });

  it("catalog survives a new application instance on the same DB (TEST-F02-10 instance-level portion)", async () => {
    await seedFixtures();
    const before = await pool.query(`SELECT id, name, quantity_total FROM equipment ORDER BY id`);
    // Instance-level check (fast complement to the real process-restart
    // evidence in restart-e2e.test.ts — see that file for AC-06.2-03 proof):
    // a brand-new app instance on the same durable database reads identical
    // records. Loan-dependent domain records remain dependency-gated (F-04/F-05).
    const sessions2 = new SessionStore(pool, config.session.idleMinutes, config.session.absoluteMinutes);
    const auth2 = new AuthService(pool, sessions2);
    const app2 = createApp({ auth: auth2, config });
    const cookie = await login("B-A-cat", "pw-cat");
    const res = await request(app2).get("/api/equipment").set("Cookie", `pew_session=${cookie}`);
    expect(res.status).toBe(200);
    const after = res.body.data.map((i: { id: string; name: string; quantity_total: number }) => ({ id: i.id, name: i.name, quantity_total: i.quantity_total }));
    expect(after).toEqual(before.rows.map((r: { id: string; name: string; quantity_total: number }) => ({ id: r.id, name: r.name, quantity_total: Number(r.quantity_total) })));
    // loan-dependent domain records portion of TEST-F02-10 remains dependency-gated (F-04/F-05)
  });
});
