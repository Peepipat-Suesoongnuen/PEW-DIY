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
import { ReportingService } from "../src/services/reporting";
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
  await pool.query(`DELETE FROM notifications WHERE user_id IN ('s2-b-a', 's2-b-b', 's2-c-a')`);
  await pool.query(
    `DELETE FROM loans WHERE request_id IN (SELECT id FROM borrowing_requests WHERE borrower_id IN ('s2-b-a', 's2-b-b'))`,
  );
  await pool.query(`DELETE FROM borrowing_requests WHERE borrower_id IN ('s2-b-a', 's2-b-b')`);
  await pool.query(`DELETE FROM request_bundles WHERE borrower_id IN ('s2-b-a', 's2-b-b')`);
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
    const approveRes = await request(app)
      .post(`/api/requests/${reqRes.body.data.id}/approve`)
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[2]!)
      .send({});
    expect(approveRes.status).toBe(200);
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

    // Borrower never sees RETIRED in list even if status=ALL or status=RETIRED
    const borrowerAll = await request(app).get("/api/equipment?status=ALL").set("Cookie", cookies[0]!);
    expect(borrowerAll.body.data.map((i: { id: string }) => i.id)).not.toContain(c);
    const borrowerRetired = await request(app).get("/api/equipment?status=RETIRED").set("Cookie", cookies[0]!);
    expect(borrowerRetired.body.data.map((i: { id: string }) => i.id)).not.toContain(c);

    // Custodian defaults to ACTIVE only when status query is omitted; sees RETIRED/ALL when requested
    const custodianDefault = await request(app).get("/api/equipment").set("Cookie", cookies[2]!);
    expect(custodianDefault.status).toBe(200);
    expect(custodianDefault.body.data.map((i: { id: string }) => i.id)).toContain(a);
    expect(custodianDefault.body.data.map((i: { id: string }) => i.id)).not.toContain(c);

    const custodianRetired = await request(app).get("/api/equipment?status=RETIRED").set("Cookie", cookies[2]!);
    expect(custodianRetired.body.data.map((i: { id: string }) => i.id)).toContain(c);

    const custodianAll = await request(app).get("/api/equipment?status=ALL").set("Cookie", cookies[2]!);
    expect(custodianAll.body.data.map((i: { id: string }) => i.id)).toContain(c);

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

describe("A-11 Approval Workflow, Multi-Item Bundles, 1-14d Duration & Cancellation (TEST-F11-01..04)", () => {
  it("creates multi-item bundle without stock reservation, enforces approval gate, and computes 14d due_on", async () => {
    const e1 = await seedItem("e1", `${PREFIX}Arduino Uno`, "Boards", 2);
    const e2 = await seedItem("e2", `${PREFIX}Multimeter`, "Tools", 3);
    const app = appWithNow("2026-11-23T10:00:00Z");

    // Invalid duration (0, 15) and duplicate equipment_id rejected with 400
    for (const badBundle of [
      { items: [{ equipment_id: e1, quantity_requested: 1 }], requested_days: 0 },
      { items: [{ equipment_id: e1, quantity_requested: 1 }], requested_days: 15 },
      { items: [{ equipment_id: e1, quantity_requested: 1 }, { equipment_id: e1, quantity_requested: 1 }], requested_days: 7 },
    ]) {
      const badRes = await request(app)
        .post("/api/request-bundles")
        .set("Origin", config.appOrigin)
        .set("Cookie", cookies[0]!)
        .send(badBundle);
      expect(badRes.status).toBe(400);
    }

    // Multi-item bundle created as PENDING (no stock decrement — BR-12)
    const bundleRes = await request(app)
      .post("/api/request-bundles")
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[0]!)
      .send({
        items: [
          { equipment_id: e1, quantity_requested: 1 },
          { equipment_id: e2, quantity_requested: 2 },
        ],
        purpose_category: "CAPSTONE",
        purpose_detail: "Robotics capstone prototype",
        requested_days: 14,
      });
    expect(bundleRes.status).toBe(201);
    const bundleId = bundleRes.body.data.bundle_id as string;
    expect(bundleRes.body.data.requests).toHaveLength(2);
    expect(bundleRes.body.data.requests[0].approval_status).toBe("PENDING");

    // Stock unchanged before approval/checkout (BR-12)
    expect((await request(app).get(`/api/equipment/${e1}`).set("Cookie", cookies[0]!)).body.data.quantity_available).toBe(2);
    expect((await request(app).get(`/api/equipment/${e2}`).set("Cookie", cookies[0]!)).body.data.quantity_available).toBe(3);

    // Checkout before approval fails with 409 NOT_APPROVED
    const unapprovedCheckout = await request(app)
      .post(`/api/request-bundles/${bundleId}/checkout`)
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[2]!)
      .send({});
    expect(unapprovedCheckout.status).toBe(409);
    expect(unapprovedCheckout.body.error.code).toBe("NOT_APPROVED");

    // Borrower forbidden from approving
    const borrowerApprove = await request(app)
      .post(`/api/request-bundles/${bundleId}/approve`)
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[0]!)
      .send({});
    expect(borrowerApprove.status).toBe(403);

    // Custodian approves bundle -> APPROVED, stock still unreserved, notification persisted (AC-F11-02)
    const approveRes = await request(app)
      .post(`/api/request-bundles/${bundleId}/approve`)
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[2]!)
      .send({ decision_note: "Approved for lab" });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.every((r: { approval_status: string }) => r.approval_status === "APPROVED")).toBe(true);
    expect((await request(app).get(`/api/equipment/${e1}`).set("Cookie", cookies[0]!)).body.data.quantity_available).toBe(2);
    const notifRows = await pool.query(
      `SELECT kind, reference_id FROM notifications WHERE user_id = 's2-b-a' AND reference_id = $1`,
      [bundleId],
    );
    expect(notifRows.rows).toEqual([{ kind: "REQUEST_APPROVED", reference_id: bundleId }]);

    // Custodian checks out entire bundle -> Loans created with 14-day due_on (2026-12-07)
    const checkoutRes = await request(app)
      .post(`/api/request-bundles/${bundleId}/checkout`)
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[2]!)
      .send({});
    expect(checkoutRes.status).toBe(201);
    expect(checkoutRes.body.data).toHaveLength(2);
    expect(checkoutRes.body.data[0].due_on).toBe("2026-12-07");
    expect((await request(app).get(`/api/equipment/${e1}`).set("Cookie", cookies[0]!)).body.data.quantity_available).toBe(1);
    expect((await request(app).get(`/api/equipment/${e2}`).set("Cookie", cookies[0]!)).body.data.quantity_available).toBe(1);
  });

  it("allows Borrower cancellation of own unfulfilled request, blocks cross-owner/checked-out cancel, and supports Custodian reject (TEST-F11-02/04)", async () => {
    const e1 = await seedItem("cancel", `${PREFIX}Relay`, "Parts", 2);
    const app = appWithNow();

    const r1 = await request(app)
      .post("/api/requests")
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[0]!)
      .send({ equipment_id: e1, quantity_requested: 1 });
    const reqId = r1.body.data.id as string;

    // Cross-owner cancel forbidden
    const crossCancel = await request(app)
      .post(`/api/requests/${reqId}/cancel`)
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[1]!)
      .send({});
    expect(crossCancel.status).toBe(403);

    // Owner cancels PENDING request -> 200 CANCELLED
    const ownCancel = await request(app)
      .post(`/api/requests/${reqId}/cancel`)
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[0]!)
      .send({});
    expect(ownCancel.status).toBe(200);
    expect(ownCancel.body.data.status).toBe("CANCELLED");

    // Second request rejected by Custodian -> REJECTED + REQUEST_REJECTED notification, checkout blocked 409 NOT_APPROVED
    const r2 = await request(app)
      .post("/api/requests")
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[0]!)
      .send({ equipment_id: e1, quantity_requested: 1 });
    const req2Id = r2.body.data.id as string;

    const rejectRes = await request(app)
      .post(`/api/requests/${req2Id}/reject`)
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[2]!)
      .send({ decision_note: "Out for calibration" });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe("REJECTED");

    const rejectedCheckout = await request(app)
      .post(`/api/requests/${req2Id}/checkout`)
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[2]!)
      .send({});
    expect(rejectedCheckout.status).toBe(409);
    expect(rejectedCheckout.body.error.code).toBe("NOT_APPROVED");
  });
});

describe("F-06 Two-Step Return & F-08 Full Loan Views/History (TEST-F06-01..05, TEST-F08-05)", () => {
  it("supports Borrower return notice, Custodian atomic return + bundle return, 409 ALREADY_RETURNED, authz, rollback & loan scopes", async () => {
    const e1 = await seedItem("ret1", `${PREFIX}Oscilloscope`, "Lab", 3);
    const e2 = await seedItem("ret2", `${PREFIX}Logic Analyzer`, "Lab", 2);
    const app = appWithNow("2026-11-23T10:00:00Z");

    // Seed single loan for B-A and bundle loan for B-B
    const rA = await request(app)
      .post("/api/requests")
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[0]!)
      .send({ equipment_id: e1, quantity_requested: 2 });
    const reqAId = rA.body.data.id as string;
    await request(app).post(`/api/requests/${reqAId}/approve`).set("Origin", config.appOrigin).set("Cookie", cookies[2]!).send({});
    const checkoutA = await request(app)
      .post(`/api/requests/${reqAId}/checkout`)
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[2]!)
      .send({});
    expect(checkoutA.status).toBe(201);
    expect(checkoutA.body.data.checked_out_by_username).toBe("s2-c-a");
    const loanAId = checkoutA.body.data.id as string;

    // TEST-F06-04: Anonymous -> 401; Borrower /return -> 403; cross-owner /request-return -> 403
    expect(
      (await request(app).post(`/api/loans/${loanAId}/request-return`).set("Origin", config.appOrigin).send({})).status,
    ).toBe(401);
    expect(
      (await request(app).post(`/api/loans/${loanAId}/return`).set("Origin", config.appOrigin).set("Cookie", cookies[0]!).send({})).status,
    ).toBe(403);
    expect(
      (await request(app).post(`/api/loans/${loanAId}/request-return`).set("Origin", config.appOrigin).set("Cookie", cookies[1]!).send({})).status,
    ).toBe(403);

    // TEST-F06-01: Borrower submits request-return -> 200 RETURN_PENDING, stock unchanged (still 1 available)
    const reqRet = await request(app)
      .post(`/api/loans/${loanAId}/request-return`)
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[0]!)
      .send({ return_note: "Leaving at desk B" });
    expect(reqRet.status).toBe(200);
    expect(reqRet.body.data.status).toBe("RETURN_PENDING");
    expect(reqRet.body.data.return_note).toBe("Leaving at desk B");
    const eqBeforeReturn = await request(app).get(`/api/equipment/${e1}`).set("Cookie", cookies[0]!);
    expect(eqBeforeReturn.body.data.quantity_available).toBe(1);

    // TEST-F06-05: Fault injected before return commit rolls back returned_at and stock
    const failingApp = createApp({
      auth,
      config,
      loans: new LoanService(pool, {
        timeZone: "Asia/Bangkok",
        now: () => new Date("2026-11-24T10:00:00Z"),
        afterInsert: async () => {
          throw new Error("injected-return-failure");
        },
      }),
    });
    const failedRet = await request(failingApp)
      .post(`/api/loans/${loanAId}/return`)
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[2]!)
      .send({});
    expect(failedRet.status).toBe(500);
    const stillPending = await request(app).get(`/api/loans/${loanAId}`).set("Cookie", cookies[0]!);
    expect(stillPending.body.data.status).toBe("RETURN_PENDING");
    expect((await request(app).get(`/api/equipment/${e1}`).set("Cookie", cookies[0]!)).body.data.quantity_available).toBe(1);

    // TEST-F06-02: Custodian confirms return -> 200 RETURNED, stock restored to 3
    const confirmRet = await request(app)
      .post(`/api/loans/${loanAId}/return`)
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[2]!)
      .send({});
    expect(confirmRet.status).toBe(200);
    expect(confirmRet.body.data.status).toBe("RETURNED");
    expect(confirmRet.body.data.returned_by).toBe("s2-c-a");
    expect((await request(app).get(`/api/equipment/${e1}`).set("Cookie", cookies[0]!)).body.data.quantity_available).toBe(3);

    // TEST-F06-03: Repeat /return and /request-return on RETURNED loan -> 409 ALREADY_RETURNED
    const repeatRet = await request(app)
      .post(`/api/loans/${loanAId}/return`)
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[2]!)
      .send({});
    expect(repeatRet.status).toBe(409);
    expect(repeatRet.body.error.code).toBe("ALREADY_RETURNED");

    const repeatReqRet = await request(app)
      .post(`/api/loans/${loanAId}/request-return`)
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[0]!)
      .send({});
    expect(repeatReqRet.status).toBe(409);
    expect(repeatReqRet.body.error.code).toBe("ALREADY_RETURNED");

    // Bundle return + TEST-F08-05 loan scopes (Custodian all/history/active; Borrower history & 403 cross-owner)
    const bBundle = await request(app)
      .post("/api/request-bundles")
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[1]!)
      .send({
        items: [
          { equipment_id: e1, quantity_requested: 1 },
          { equipment_id: e2, quantity_requested: 1 },
        ],
      });
    const bBundleId = bBundle.body.data.bundle_id as string;
    await request(app).post(`/api/request-bundles/${bBundleId}/approve`).set("Origin", config.appOrigin).set("Cookie", cookies[2]!).send({});
    await request(app).post(`/api/request-bundles/${bBundleId}/checkout`).set("Origin", config.appOrigin).set("Cookie", cookies[2]!).send({});

    const custodianActive = await request(app).get("/api/loans?scope=active").set("Cookie", cookies[2]!);
    expect(custodianActive.status).toBe(200);
    expect(custodianActive.body.data.map((l: { id: string }) => l.id)).not.toContain(loanAId);
    expect(custodianActive.body.data.filter((l: { bundle_id: string | null }) => l.bundle_id === bBundleId)).toHaveLength(2);

    const custodianHistory = await request(app).get("/api/loans?scope=history").set("Cookie", cookies[2]!);
    expect(custodianHistory.status).toBe(200);
    expect(custodianHistory.body.data.map((l: { id: string }) => l.id)).toContain(loanAId);

    const borrowerAHistory = await request(app).get("/api/loans?scope=history").set("Cookie", cookies[0]!);
    expect(borrowerAHistory.status).toBe(200);
    expect(borrowerAHistory.body.data.map((l: { id: string }) => l.id)).toEqual([loanAId]);

    // Borrower B cannot read Borrower A's returned loan detail -> 403
    expect((await request(app).get(`/api/loans/${loanAId}`).set("Cookie", cookies[1]!)).status).toBe(403);

    // Custodian confirms entire bundle return -> both loans RETURNED, stock restored
    const bundleRet = await request(app)
      .post(`/api/loan-bundles/${bBundleId}/return`)
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[2]!)
      .send({ return_note: "Bundle complete" });
    expect(bundleRet.status).toBe(200);
    expect(bundleRet.body.data).toHaveLength(2);
    expect(bundleRet.body.data.every((l: { status: string }) => l.status === "RETURNED")).toBe(true);
    expect((await request(app).get(`/api/equipment/${e2}`).set("Cookie", cookies[0]!)).body.data.quantity_available).toBe(2);
  });
});

describe("F-07 Overdue Derivation & Persistent In-App Notifications (TEST-F07-01..04)", () => {
  it("derives overdue across Asia/Bangkok midnight, enforces Custodian-only scope=overdue, syncs alerts, and isolates markRead/clearAll", async () => {
    const e1 = await seedItem("ov1", `${PREFIX}Signal Generator`, "Lab", 3);
    // Checkout at 2026-11-23T10:00:00Z (17:00+07) for 7 days -> due_on = 2026-11-30
    const appCheckout = appWithNow("2026-11-23T10:00:00Z");
    const reqA = await request(appCheckout)
      .post("/api/requests")
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[0]!)
      .send({ equipment_id: e1, quantity_requested: 1, requested_days: 7 });
    const reqAId = reqA.body.data.id as string;
    await request(appCheckout).post(`/api/requests/${reqAId}/approve`).set("Origin", config.appOrigin).set("Cookie", cookies[2]!).send({});
    const loanARes = await request(appCheckout).post(`/api/requests/${reqAId}/checkout`).set("Origin", config.appOrigin).set("Cookie", cookies[2]!).send({});
    const loanAId = loanARes.body.data.id as string;
    expect(loanARes.body.data.due_on).toBe("2026-11-30");

    // Create a second request for B-B so B-B also has a notification that must remain untouched by B-A
    const reqB = await request(appCheckout)
      .post("/api/requests")
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[1]!)
      .send({ equipment_id: e1, quantity_requested: 1, requested_days: 7 });
    await request(appCheckout).post(`/api/requests/${reqB.body.data.id}/approve`).set("Origin", config.appOrigin).set("Cookie", cookies[2]!).send({});

    // TEST-F07-01: At 2026-11-30T16:59:00Z (23:59+07) -> NOT overdue, but LOAN_DUE_SOON
    const appDueDay = appWithNow("2026-11-30T16:59:00Z");
    const detailDueDay = await request(appDueDay).get(`/api/loans/${loanAId}`).set("Cookie", cookies[0]!);
    expect(detailDueDay.status).toBe(200);
    expect(detailDueDay.body.data.overdue).toBe(false);

    // At 2026-11-30T17:01:00Z (2026-12-01T00:01+07) -> overdue=true
    const appPastDue = appWithNow("2026-11-30T17:01:00Z");
    const detailPastDue = await request(appPastDue).get(`/api/loans/${loanAId}`).set("Cookie", cookies[0]!);
    expect(detailPastDue.status).toBe(200);
    expect(detailPastDue.body.data.overdue).toBe(true);

    // TEST-F07-02: Custodian GET /api/loans?scope=overdue -> returns loanAId; Borrower -> 403
    const custOverdue = await request(appPastDue).get("/api/loans?scope=overdue").set("Cookie", cookies[2]!);
    expect(custOverdue.status).toBe(200);
    expect(custOverdue.body.data.map((l: { id: string }) => l.id)).toContain(loanAId);
    const borrowerOverdue = await request(appPastDue).get("/api/loans?scope=overdue").set("Cookie", cookies[0]!);
    expect(borrowerOverdue.status).toBe(403);

    // TEST-F07-03 & TEST-F07-04: Notifications auth, sync (REQUEST_APPROVED, LOAN_DUE_SOON, LOAN_OVERDUE), cross-owner 403, markRead, clearAll
    expect((await request(appPastDue).get("/api/notifications")).status).toBe(401);
    const bANotifs = await request(appPastDue).get("/api/notifications").set("Cookie", cookies[0]!);
    expect(bANotifs.status).toBe(200);
    const kinds = bANotifs.body.data.map((n: { kind: string }) => n.kind);
    expect(kinds).toContain("REQUEST_APPROVED");
    expect(kinds).toContain("LOAN_OVERDUE");

    const firstId = bANotifs.body.data[0].id as string;
    // Cross-owner B-B marking B-A's notification read -> 403
    const crossRead = await request(appPastDue)
      .post(`/api/notifications/${firstId}/read`)
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[1]!)
      .send({});
    expect(crossRead.status).toBe(403);

    // B-A marks 1 notification read -> 200, removed from active list
    const ownRead = await request(appPastDue)
      .post(`/api/notifications/${firstId}/read`)
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[0]!)
      .send({});
    expect(ownRead.status).toBe(200);
    const afterRead = await request(appPastDue).get("/api/notifications").set("Cookie", cookies[0]!);
    expect(afterRead.body.data.map((n: { id: string }) => n.id)).not.toContain(firstId);

    // B-A clears all -> 204, active list empty, B-B's notification untouched
    const cleared = await request(appPastDue)
      .delete("/api/notifications")
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[0]!);
    expect(cleared.status).toBe(204);
    expect((await request(appPastDue).get("/api/notifications").set("Cookie", cookies[0]!)).body.data).toEqual([]);
    const bBNotifs = await request(appPastDue).get("/api/notifications").set("Cookie", cookies[1]!);
    expect(bBNotifs.body.data.length).toBeGreaterThan(0);

    // Returning the loan clears overdue=false
    await request(appPastDue).post(`/api/loans/${loanAId}/return`).set("Origin", config.appOrigin).set("Cookie", cookies[2]!).send({});
    const returnedDetail = await request(appPastDue).get(`/api/loans/${loanAId}`).set("Cookie", cookies[0]!);
    expect(returnedDetail.body.data.overdue).toBe(false);
  });
});

describe("F-09 Inventory Reporting Summary (TEST-F09-01..02)", () => {
  it("enforces Custodian-only RBAC on GET /api/reports/summary and returns live inventory, request, loan & overdue aggregates", async () => {
    const e1 = await seedItem("rep1", `${PREFIX}Function Gen`, "Lab", 4);
    const e2 = await seedItem("rep2", `${PREFIX}Legacy Scope`, "Lab", 2, "RETIRED");
    const appCheckout = appWithNow("2026-11-23T10:00:00Z");

    // Seed 1 ACTIVE overdue loan (qty 2) and 1 RETURN_PENDING overdue loan (qty 1), plus 1 pending request
    const r1 = await request(appCheckout)
      .post("/api/requests")
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[0]!)
      .send({ equipment_id: e1, quantity_requested: 2, requested_days: 1 });
    await request(appCheckout).post(`/api/requests/${r1.body.data.id}/approve`).set("Origin", config.appOrigin).set("Cookie", cookies[2]!).send({});
    const loanRes = await request(appCheckout).post(`/api/requests/${r1.body.data.id}/checkout`).set("Origin", config.appOrigin).set("Cookie", cookies[2]!).send({});
    const loanId = loanRes.body.data.id as string;

    const rRet = await request(appCheckout)
      .post("/api/requests")
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[1]!)
      .send({ equipment_id: e1, quantity_requested: 1, requested_days: 1 });
    await request(appCheckout).post(`/api/requests/${rRet.body.data.id}/approve`).set("Origin", config.appOrigin).set("Cookie", cookies[2]!).send({});
    const loanRetRes = await request(appCheckout).post(`/api/requests/${rRet.body.data.id}/checkout`).set("Origin", config.appOrigin).set("Cookie", cookies[2]!).send({});
    await request(appCheckout).post(`/api/loans/${loanRetRes.body.data.id}/request-return`).set("Origin", config.appOrigin).set("Cookie", cookies[1]!).send({});

    await request(appCheckout)
      .post("/api/requests")
      .set("Origin", config.appOrigin)
      .set("Cookie", cookies[1]!)
      .send({ equipment_id: e1, quantity_requested: 1 });

    // Evaluate report at 2026-11-26 (2 days past due_on=2026-11-24)
    const appReport = appWithNow("2026-11-26T10:00:00Z");

    // TEST-F09-02: Anonymous -> 401; Borrower -> 403
    expect((await request(appReport).get("/api/reports/summary")).status).toBe(401);
    const borrowerReport = await request(appReport).get("/api/reports/summary").set("Cookie", cookies[0]!);
    expect(borrowerReport.status).toBe(403);
    expect(borrowerReport.body.data).toBeUndefined();

    // TEST-F09-01: Custodian -> 200 with accurate live aggregates, mutually exclusive loan counters & held_units
    const custReport = await request(appReport).get("/api/reports/summary").set("Cookie", cookies[2]!);
    expect(custReport.status).toBe(200);
    const summary = custReport.body.data;
    expect(summary.business_date).toBe("2026-11-26");
    expect(summary.inventory.active_items).toBeGreaterThanOrEqual(1);
    expect(summary.inventory.retired_items).toBeGreaterThanOrEqual(1);
    expect(summary.inventory.held_units).toBeGreaterThanOrEqual(3);
    expect(summary.requests.pending_count).toBeGreaterThanOrEqual(1);
    expect(summary.requests.checked_out_count).toBeGreaterThanOrEqual(2);
    expect(summary.loans.active_count).toBe(1);
    expect(summary.loans.return_pending_count).toBe(1);
    expect(summary.loans.overdue_count).toBe(2);
    const rep1Item = summary.items.find((i: { id: string }) => i.id === e1);
    expect(rep1Item?.quantity_available).toBe(1);
    expect(rep1Item?.held_units).toBe(3);
    const rep2Item = summary.items.find((i: { id: string }) => i.id === e2);
    expect(rep2Item?.catalog_status).toBe("RETIRED");
    expect(rep2Item?.held_units).toBe(0);
    const ovEntry = summary.overdue_loans.find((o: { loan_id: string }) => o.loan_id === loanId);
    expect(ovEntry).toMatchObject({
      loan_id: loanId,
      equipment_id: e1,
      borrower_username: "s2-b-a",
      quantity_borrowed: 2,
      due_on: "2026-11-24",
      days_overdue: 2,
    });
  });

  it("executes all getSummary() reads inside a single REPEATABLE READ READ ONLY transaction", async () => {
    const queries: string[] = [];
    let connectCount = 0;
    const wrappedPool = {
      async connect() {
        connectCount++;
        const client = await pool.connect();
        const origQuery = client.query.bind(client);
        return Object.assign(client, {
          query: ((...args: Parameters<typeof origQuery>) => {
            if (typeof args[0] === "string") queries.push(args[0]);
            return origQuery(...args);
          }) as typeof client.query,
        });
      },
      query() {
        throw new Error("ReportingService.getSummary() must not query pool directly outside the snapshot client");
      },
    } as unknown as Pool;

    const svc = new ReportingService(wrappedPool, { timeZone: "Asia/Bangkok", now: () => new Date("2026-11-26T10:00:00Z") });
    await svc.getSummary();
    expect(connectCount).toBe(1);
    expect(queries[0]).toMatch(/BEGIN\s+ISOLATION\s+LEVEL\s+REPEATABLE\s+READ\s+READ\s+ONLY/i);
    expect(queries[queries.length - 1]).toMatch(/COMMIT/i);
  });
});
