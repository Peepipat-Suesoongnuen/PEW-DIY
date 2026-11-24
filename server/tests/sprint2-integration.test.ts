/**
 * Sprint 2 backend integration tests against real PostgreSQL — Slice 2 (#102):
 * - F-08 Catalog CRUD (create, edit, retire, new_total < held 409 HELD_QUANTITY_CONFLICT)
 * - F-08 Catalog Search, Filter & Sort (q, category, availability, status, default name_asc & explicit sorts)
 * - BR-01 Retired equipment cannot be requested (409 EQUIPMENT_RETIRED)
 * - Security validation on image_url (rejects javascript:, protocol-relative //, and NUL bytes)
 */
import { randomBytes, randomUUID } from "crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Pool } from "pg";
import { createApp } from "../src/routes/auth-routes";
import { AuthService } from "../src/services/auth";
import { SessionStore, type SessionUser } from "../src/services/session";
import { hashPassword } from "../src/services/password";
import { LoanService } from "../src/services/loan";
import { configForTests, createTestContext } from "./harness";

let pool: Pool;
let auth: AuthService;
let sessions: SessionStore;
const config = configForTests();

const users: SessionUser[] = [
  { id: "s2-b-a", username: "s2-b-a", role: "BORROWER" },
  { id: "s2-b-b", username: "s2-b-b", role: "BORROWER" },
  { id: "s2-c-a", username: "s2-c-a", role: "CUSTODIAN" },
];
let cookies: string[];
const PREFIX = "s2-item-";

function appWithNow(nowIso = "2026-11-23T10:00:00Z") {
  const fixedNow = () => new Date(nowIso);
  return createApp({
    auth,
    config,
    loans: new LoanService(pool, { timeZone: "Asia/Bangkok", now: fixedNow }),
  });
}

async function cleanup() {
  await pool.query(
    `DELETE FROM loans WHERE request_id IN (SELECT id FROM borrowing_requests WHERE borrower_id IN ('s2-b-a', 's2-b-b'))`,
  );
  await pool.query(`DELETE FROM borrowing_requests WHERE borrower_id IN ('s2-b-a', 's2-b-b')`);
  await pool.query(`DELETE FROM equipment WHERE id LIKE $1 OR name LIKE $1`, [`${PREFIX}%`]);
}

beforeAll(async () => {
  ({ pool } = await createTestContext());
  await cleanup();
  for (const u of users) {
    await pool.query(
      `INSERT INTO users(id, username, password_hash, role) VALUES($1, $2, $3, $4)
       ON CONFLICT(id) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [u.id, u.username, await hashPassword(randomBytes(24).toString("hex")), u.role],
    );
  }
  sessions = new SessionStore(pool, 60, 480);
  auth = new AuthService(pool, sessions);
  cookies = await Promise.all(users.map(async (u) => `${config.session.cookieName}=${(await sessions.create(u.id)).rawId}`));
});

beforeEach(cleanup);

afterAll(async () => {
  if (!pool) return;
  await cleanup();
  await pool.query(`DELETE FROM sessions WHERE user_id IN ('s2-b-a', 's2-b-b', 's2-c-a')`);
  await pool.query(`DELETE FROM users WHERE id IN ('s2-b-a', 's2-b-b', 's2-c-a')`);
  await pool.end();
});

async function seedItem(suffix: string, name: string, category: string, total: number, status: "ACTIVE" | "RETIRED" = "ACTIVE") {
  const id = `${PREFIX}${suffix}-${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO equipment(id, name, description, category, quantity_total, image_url, catalog_status)
     VALUES ($1, $2, $3, $4, $5, '', $6)`,
    [id, name, `${name} desc`, category, total, status],
  );
  return id;
}

describe("F-08 Catalog CRUD, Retire, Search/Filter/Sort & Security", () => {
  it("Custodian creates, updates, retires items and prevents reducing total below held (TEST-F08-01/02/03)", async () => {
    const app = appWithNow();
    // Borrower forbidden from create/edit (TEST-F08-03)
    const forbiddenCreate = await request(app)
      .post("/api/equipment")
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[0]!)
      .send({ name: `${PREFIX}Uno`, description: "Board", category: "Boards", quantity_total: 2 });
    expect(forbiddenCreate.status).toBe(403);

    // Custodian creates item with image_url and optional empty description (TEST-F08-01)
    const created = await request(app)
      .post("/api/equipment")
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[2]!)
      .send({
        name: `${PREFIX}Arduino`,
        description: "",
        category: "Boards",
        quantity_total: 3,
        image_url: "https://example.com/arduino.png",
      });
    expect(created.status).toBe(201);
    const eqId = created.body.data.id as string;
    expect(created.body.data).toMatchObject({
      name: `${PREFIX}Arduino`,
      description: "",
      category: "Boards",
      quantity_total: 3,
      quantity_available: 3,
      availability: "AVAILABLE",
      image_url: "https://example.com/arduino.png",
      catalog_status: "ACTIVE",
    });

    const forbiddenPatch = await request(app)
      .patch(`/api/equipment/${eqId}`)
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[0]!)
      .send({ name: `${PREFIX}Tampered` });
    expect(forbiddenPatch.status).toBe(403);

    // Rejects unsafe image_url schemes (javascript:, protocol-relative //, NUL byte)
    for (const badUrl of ["javascript:alert(1)", "//evil.com/x.png", "/images/bad\0.png"]) {
      const badRes = await request(app)
        .patch(`/api/equipment/${eqId}`)
        .set("Origin", config.appOrigin)
        .set("Cookie", cookies[2]!)
        .send({ image_url: badUrl });
      expect(badRes.status).toBe(400);
      expect(badRes.body.error.code).toBe("VALIDATION_ERROR");
    }

    // Create active loan holding 2 units
    const reqRes = await request(app)
      .post("/api/requests")
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[0]!)
      .send({ equipment_id: eqId, quantity_requested: 2 });
    expect(reqRes.status).toBe(201);
    const checkoutRes = await request(app)
      .post(`/api/requests/${reqRes.body.data.id}/checkout`)
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[2]!)
      .send({});
    expect(checkoutRes.status).toBe(201);

    // Reducing total below held=2 returns 409 HELD_QUANTITY_CONFLICT (TEST-F08-02)
    const conflictPatch = await request(app)
      .patch(`/api/equipment/${eqId}`)
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[2]!)
      .send({ quantity_total: 1 });
    expect(conflictPatch.status).toBe(409);
    expect(conflictPatch.body.error.code).toBe("HELD_QUANTITY_CONFLICT");

    // Reducing to 2, setting relative image_url, and retiring succeeds
    const validPatch = await request(app)
      .patch(`/api/equipment/${eqId}`)
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[2]!)
      .send({ quantity_total: 2, image_url: "/images/arduino.png", catalog_status: "RETIRED" });
    expect(validPatch.status).toBe(200);
    expect(validPatch.body.data).toMatchObject({
      quantity_total: 2,
      quantity_available: 0,
      image_url: "/images/arduino.png",
      catalog_status: "RETIRED",
    });

    // Borrower cannot request retired item (409 EQUIPMENT_RETIRED even when available=0 or available>0)
    const retiredReq = await request(app)
      .post("/api/requests")
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[0]!)
      .send({ equipment_id: eqId, quantity_requested: 1 });
    expect(retiredReq.status).toBe(409);
    expect(retiredReq.body.error.code).toBe("EQUIPMENT_RETIRED");

    const retiredWithStockId = await seedItem("ret-stock", `${PREFIX}RetiredStock`, "Boards", 3, "RETIRED");
    const retiredWithStockReq = await request(app)
      .post("/api/requests")
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[0]!)
      .send({ equipment_id: retiredWithStockId, quantity_requested: 1 });
    expect(retiredWithStockReq.status).toBe(409);
    expect(retiredWithStockReq.body.error.code).toBe("EQUIPMENT_RETIRED");

    // 404 NOT_FOUND on PATCH for unknown equipment id
    const missingPatch = await request(app)
      .patch("/api/equipment/eq-does-not-exist")
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[2]!)
      .send({ name: `${PREFIX}Ghost` });
    expect(missingPatch.status).toBe(404);
    expect(missingPatch.body.error.code).toBe("NOT_FOUND");

    // 400 VALIDATION_ERROR on malformed POST / PATCH payloads
    for (const badCreate of [
      { name: "   ", category: "Boards", quantity_total: 1 },
      { name: `${PREFIX}Bad`, category: "", quantity_total: 1 },
      { name: `${PREFIX}Bad`, category: "Boards", quantity_total: -1 },
      { name: `${PREFIX}Bad`, category: "Boards", quantity_total: 1.5 },
      { name: `${PREFIX}Bad`, category: "Boards", quantity_total: 1, extra: true },
    ]) {
      const res = await request(app)
        .post("/api/equipment")
        .set("Origin", config.appOrigin)
        .set("Cookie", cookies[2]!)
        .send(badCreate);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }

    for (const badPatch of [
      {},
      { name: "   " },
      { category: "   " },
      { quantity_total: -1 },
      { quantity_total: 2.5 },
      { catalog_status: "ARCHIVED" },
      { unknown_field: "x" },
    ]) {
      const res = await request(app)
        .patch(`/api/equipment/${eqId}`)
        .set("Origin", config.appOrigin)
        .set("Cookie", cookies[2]!)
        .send(badPatch);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("filters and sorts equipment via GET /api/equipment including default name_asc sort (TEST-F08-04)", async () => {
    const z = await seedItem("a-first-id", `${PREFIX}Zulu Meter`, "Sensors", 5);
    const a = await seedItem("z-second-id", `${PREFIX}Alpha Sensor`, "Sensors", 2);
    const b = await seedItem("b", `${PREFIX}Beta Soldering`, "Tools", 0);
    const c = await seedItem("c", `${PREFIX}Gamma Retired`, "Tools", 2, "RETIRED");
    const app = appWithNow();

    // Default sort (no sort param) sorts by name_asc (Alpha before Zulu even though Zulu's id is smaller)
    const defaultSensors = await request(app)
      .get("/api/equipment?category=Sensors")
      .set("Cookie", cookies[0]!);
    expect(defaultSensors.status).toBe(200);
    const sensorIds = defaultSensors.body.data
      .map((i: { id: string }) => i.id)
      .filter((id: string) => id === a || id === z);
    expect(sensorIds).toEqual([a, z]);

    const borrowerRes = await request(app)
      .get(`/api/equipment?q=${encodeURIComponent("Alpha")}&availability=AVAILABLE&sort=name_asc`)
      .set("Cookie", cookies[0]!);
    expect(borrowerRes.status).toBe(200);
    expect(borrowerRes.body.data.map((i: { id: string }) => i.id)).toEqual([a]);

    // Borrower never sees RETIRED in list even if status=ALL
    const borrowerAll = await request(app).get("/api/equipment?status=ALL").set("Cookie", cookies[0]!);
    expect(borrowerAll.body.data.map((i: { id: string }) => i.id)).not.toContain(c);

    // Custodian sees RETIRED when filtering status=RETIRED
    const custodianRetired = await request(app).get("/api/equipment?status=RETIRED").set("Cookie", cookies[2]!);
    expect(custodianRetired.body.data.map((i: { id: string }) => i.id)).toContain(c);

    // Sort by available_asc puts 0-stock Beta first in Tools
    const sorted = await request(app).get("/api/equipment?category=Tools&sort=available_asc").set("Cookie", cookies[0]!);
    expect(sorted.body.data.map((i: { id: string }) => i.id)).toContain(b);

    // Sort by name_desc and available_desc on Sensors puts Zulu (5 available) before Alpha (2 available)
    const nameDesc = await request(app).get("/api/equipment?category=Sensors&sort=name_desc").set("Cookie", cookies[0]!);
    expect(nameDesc.body.data.map((i: { id: string }) => i.id).filter((id: string) => id === a || id === z)).toEqual([z, a]);

    const availDesc = await request(app).get("/api/equipment?category=Sensors&sort=available_desc").set("Cookie", cookies[0]!);
    expect(availDesc.body.data.map((i: { id: string }) => i.id).filter((id: string) => id === a || id === z)).toEqual([z, a]);

    // Invalid query parameters return 400 VALIDATION_ERROR
    for (const badQuery of [
      "/api/equipment?availability=MAYBE",
      "/api/equipment?status=ARCHIVED",
      "/api/equipment?sort=random",
    ]) {
      const badRes = await request(app).get(badQuery).set("Cookie", cookies[2]!);
      expect(badRes.status).toBe(400);
      expect(badRes.body.error.code).toBe("VALIDATION_ERROR");
    }
  });
});
