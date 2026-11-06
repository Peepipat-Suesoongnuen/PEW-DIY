/**
 * F-03 Equipment Availability tests — Issue #10 (contract
 * f-03-equipment-availability.md §6), restructured per the team decision
 * 2026-11-06 (Issue #10 audit: "MOVE Migration 002"):
 *
 * - Runnable NOW (no Request/Loan schema needed): TEST-F03-01, TEST-F03-03
 *   (clean fixtures), TEST-F03-05, TEST-F03-06.
 * - Real-DB loan-dependent tests are DEPENDENCY-GATED below (skipped until
 *   #11 (F-04) ships `borrowing_requests` and #12 (F-05) ships `loans` — see
 *   the handover note in src/db/migrations.ts): TEST-F03-02, AC-F03-03
 *   (both halves), the returned-loan edge case and the AC-06.3-03 data-layer
 *   constraint checks. They auto-enable (skipIf) the moment those relations
 *   exist; assertions are unchanged, never weakened.
 *
 * "Committed checkout" states are prepared as persisted Request+Loan fixture
 * rows (TEST-F03-02's own fixture recipe), because availability is derived
 * from persisted loans at read time. TEST-F03-04/07/10/11 remain
 * dependency-gated on F-04/F-05 FEATURES (Issue #11/#12) and are not claimed.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import request from "supertest";
import type express from "express";
import { createApp } from "../src/routes/auth-routes";
import { AuthService } from "../src/services/auth";
import { SessionStore } from "../src/services/session";
import { hashPassword } from "../src/services/password";
import { createPool } from "../src/db/pool";
import { loadConfig, AppConfig } from "../src/config/config";
import { createTestContext, loanRelationsExist, requireTestDbUrl, TestContext } from "./harness";
import {
  AvailabilityIntegrityError,
  deriveAvailability,
  seedEquipmentFixture,
} from "../src/services/catalog";

/** Gate: true once #11/#12 Request/Loan relations exist (probe at collection). */
const HAS_LOAN_RELATIONS = await (async () => {
  const probe = createPool(requireTestDbUrl());
  try {
    return await loanRelationsExist(probe);
  } finally {
    await probe.end();
  }
})();

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

async function seedFixtures(): Promise<void> {
  await seedEquipmentFixture(pool, { id: "fixture-e-one", name: "Synthetic single-unit fixture", description: "Test fixture", category: "Synthetic", quantityTotal: 1 });
  await seedEquipmentFixture(pool, { id: "fixture-e-many", name: "Synthetic pooled fixture", description: "Test fixture", category: "Synthetic", quantityTotal: 3 });
  await seedEquipmentFixture(pool, { id: "fixture-e-zero", name: "Synthetic zero-stock fixture", description: "Test fixture", category: "Synthetic", quantityTotal: 0 });
}

/** TEST-F03-02 fixture recipe: a submitted request fulfilled by one active loan. */
async function insertLoanFixture(opts: {
  requestId: string;
  loanId: string;
  borrowerId: string;
  equipmentId: string;
  quantity: number;
  checkedOutBy: string;
  returned?: boolean;
}): Promise<void> {
  await pool.query(
    `INSERT INTO borrowing_requests (id, borrower_id, equipment_id, quantity_requested, created_at)
     VALUES ($1, $2, $3, $4, now())`,
    [opts.requestId, opts.borrowerId, opts.equipmentId, opts.quantity],
  );
  await pool.query(
    `INSERT INTO loans (id, request_id, quantity_borrowed, checked_out_by, checkout_at, due_on, returned_at)
     VALUES ($1, $2, $3, $4, now(), current_date + 7, $5)`,
    [opts.loanId, opts.requestId, opts.quantity, opts.checkedOutBy, opts.returned ? new Date() : null],
  );
}

async function insertRequestOnly(requestId: string, borrowerId: string, equipmentId: string, quantity: number): Promise<void> {
  await pool.query(
    `INSERT INTO borrowing_requests (id, borrower_id, equipment_id, quantity_requested, created_at)
     VALUES ($1, $2, $3, $4, now())`,
    [requestId, borrowerId, equipmentId, quantity],
  );
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
  // Self-healing: clear loan-dependent debris from earlier runs BEFORE the
  // fixture users are (re)created — borrowing_requests/loans reference users.
  if (HAS_LOAN_RELATIONS) {
    await pool.query(`DELETE FROM loans`);
    await pool.query(`DELETE FROM borrowing_requests`);
  }
  const sessions = new SessionStore(pool, config.session.idleMinutes, config.session.absoluteMinutes);
  const auth = new AuthService(pool, sessions);
  app = createApp({ auth, config });
  await seedUser("u-b-a-avail", "B-A-avail", "BORROWER", "pw-avail");
  await seedUser("u-b-b-avail", "B-B-avail", "BORROWER", "pw-avail");
  await seedUser("u-c-a-avail", "C-A-avail", "CUSTODIAN", "pw-avail");
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  if (HAS_LOAN_RELATIONS) {
    // FK order: loans → requests before equipment/users are touched.
    await pool.query(`DELETE FROM loans`);
    await pool.query(`DELETE FROM borrowing_requests`);
  }
  await pool.query(`DELETE FROM sessions WHERE user_id LIKE '%-avail'`);
  await pool.query(`DELETE FROM equipment`);
  await seedFixtures();
});

afterEach(async () => {
  if (HAS_LOAN_RELATIONS) {
    await pool.query(`DELETE FROM loans`);
    await pool.query(`DELETE FROM borrowing_requests`);
  }
});

describe("Availability derivation (TEST-F03-01 / TEST-F03-05)", () => {
  it("computes total minus held with exact zero/positive boundaries (TEST-F03-01)", () => {
    expect(deriveAvailability(0, 0)).toEqual({ available: 0, availability: "UNAVAILABLE" });
    expect(deriveAvailability(1, 0)).toEqual({ available: 1, availability: "AVAILABLE" });
    expect(deriveAvailability(1, 1)).toEqual({ available: 0, availability: "UNAVAILABLE" });
    expect(deriveAvailability(3, 2)).toEqual({ available: 1, availability: "AVAILABLE" });
  });

  it("rejects invalid aggregate inputs explicitly — never clamps (TEST-F03-05)", () => {
    expect(() => deriveAvailability(-1, 0)).toThrow(AvailabilityIntegrityError);
    expect(() => deriveAvailability(1, -1)).toThrow(AvailabilityIntegrityError);
    expect(() => deriveAvailability(1, 1.5)).toThrow(AvailabilityIntegrityError);
    // held > total is corrupt state: explicit failure, NOT a clamped 0.
    expect(() => deriveAvailability(1, 2)).toThrow(AvailabilityIntegrityError);
    expect(() => deriveAvailability(1, 2)).not.toThrow(/clamp/i);
  });
});

describe("Derived availability over persisted stock (TEST-F03-03, clean fixtures)", () => {
  it("shows correct values for clean fixtures as both roles, list and detail agreeing (TEST-F03-03)", async () => {
    for (const username of ["B-A-avail", "C-A-avail"]) {
      const cookie = await login(username, "pw-avail");
      const list = await request(app).get("/api/equipment").set("Cookie", `pew_session=${cookie}`);
      expect(list.status).toBe(200);
      const byId: Record<string, { quantity_total: number; quantity_available: number; availability: string }> = {};
      for (const item of list.body.data) byId[item.id] = item;
      expect(byId["fixture-e-one"]).toMatchObject({ quantity_total: 1, quantity_available: 1, availability: "AVAILABLE" });
      expect(byId["fixture-e-many"]).toMatchObject({ quantity_total: 3, quantity_available: 3, availability: "AVAILABLE" });
      expect(byId["fixture-e-zero"]).toMatchObject({ quantity_total: 0, quantity_available: 0, availability: "UNAVAILABLE" });

      const detail = await request(app).get("/api/equipment/fixture-e-many").set("Cookie", `pew_session=${cookie}`);
      expect(detail.status).toBe(200);
      expect(detail.body.data).toMatchObject({ quantity_total: 3, quantity_available: 3, availability: "AVAILABLE" });
    }

    // Anonymous and invalid credentials are denied without equipment data.
    for (const call of [
      request(app).get("/api/equipment"),
      request(app).get("/api/equipment/fixture-e-one"),
    ]) {
      const res = await call;
      expect(res.status).toBe(401);
      expect(res.body.data).toBeUndefined();
    }
  });
});

describe("Invalid aggregate state is a safe internal error (TEST-F03-06)", () => {
  it("returns 500 INTERNAL_ERROR with requestId and leaks no quantity/stack/loan data", async () => {
    // Controlled data-access test seam: the aggregate read reports an
    // inconsistent total 1 / held 2. Everything else delegates to the real DB.
    const inconsistentAggregate = (sql: string) =>
      sql.includes("AS held") && sql.includes("FROM equipment");
    const seamPool = {
      query: (sql: string, params?: unknown[]) => {
        if (inconsistentAggregate(sql)) {
          return Promise.resolve({
            rows: [{ id: "fixture-e-one", name: "Synthetic single-unit fixture", description: "Test fixture", category: "Synthetic", quantity_total: 1, held: 2 }],
            rowCount: 1,
          });
        }
        return pool.query(sql, params as never[]);
      },
    };
    const sessions = new SessionStore(pool, config.session.idleMinutes, config.session.absoluteMinutes);
    const seamAuth = new AuthService(seamPool as unknown as Pool, sessions);
    const seamApp = createApp({ auth: seamAuth, config });

    const cookie = await login("B-A-avail", "pw-avail");
    const detail = await request(seamApp).get("/api/equipment/fixture-e-one").set("Cookie", `pew_session=${cookie}`);
    expect(detail.status).toBe(500);
    expect(detail.body.error.code).toBe("INTERNAL_ERROR");
    expect(typeof detail.body.error.requestId).toBe("string");
    const body = JSON.stringify(detail.body);
    expect(body).not.toMatch(/quantity_borrowed|loan-|req-f03|SELECT|pg_|at Object/);
    expect(detail.body.data).toBeUndefined();
    // Not a fabricated normal zero stock result.
    expect(detail.body.data?.quantity_available).toBeUndefined();
  });
});

/**
 * DEPENDENCY-GATED — real-DB loan-dependent tests (Issue #11/#12 handover).
 *
 * These run unchanged as soon as `borrowing_requests` (#11 / F-04) and `loans`
 * (#12 / F-05) exist (skipIf probe above). Until then they are skipped, per the
 * f-03 §1 note: "F-03 can be unit-specified before checkout exists, but its
 * real-DB post-checkout verification depends on F-05." Assertions are kept
 * verbatim from the RED-phase versions (never weakened).
 */
describe.skipIf(!HAS_LOAN_RELATIONS)(
  "Real-DB held-unit aggregation — dependency-gated on #11/#12 schema (TEST-F03-02 / AC-F03-03)",
  () => {
    it("aggregates all active loans for the item without exposing loan/borrower details (TEST-F03-02)", async () => {
      // E-MANY total 3; two distinct active quantity-1 loans (B-A and B-B),
      // each linked through its own request (TEST-F03-02 fixture recipe).
      await insertLoanFixture({ requestId: "req-f03-a", loanId: "loan-f03-a", borrowerId: "u-b-a-avail", equipmentId: "fixture-e-many", quantity: 1, checkedOutBy: "u-c-a-avail" });
      await insertLoanFixture({ requestId: "req-f03-b", loanId: "loan-f03-b", borrowerId: "u-b-b-avail", equipmentId: "fixture-e-many", quantity: 1, checkedOutBy: "u-c-a-avail" });

      const cookie = await login("C-A-avail", "pw-avail");
      const list = await request(app).get("/api/equipment").set("Cookie", `pew_session=${cookie}`);
      const many = list.body.data.find((i: { id: string }) => i.id === "fixture-e-many");
      expect(many).toMatchObject({ quantity_total: 3, quantity_available: 1, availability: "AVAILABLE" });

      const detail = await request(app).get("/api/equipment/fixture-e-many").set("Cookie", `pew_session=${cookie}`);
      expect(detail.body.data).toMatchObject({ quantity_total: 3, quantity_available: 1, availability: "AVAILABLE" });

      // No request/loan/user/borrower data leaks into the equipment object.
      for (const key of Object.keys(detail.body.data)) {
        expect(["id", "name", "description", "category", "quantity_total", "quantity_available", "availability"]).toContain(key);
      }
    });

    it("a submitted request alone leaves availability unchanged (non-reservation; AC-F03-03 first half)", async () => {
      await insertRequestOnly("req-f03-nr", "u-b-a-avail", "fixture-e-one", 1);
      const cookie = await login("B-A-avail", "pw-avail");
      const detail = await request(app).get("/api/equipment/fixture-e-one").set("Cookie", `pew_session=${cookie}`);
      expect(detail.body.data).toMatchObject({ quantity_total: 1, quantity_available: 1, availability: "AVAILABLE" });
    });

    it("a committed quantity-one loan flips E-ONE from 1/AVAILABLE to 0/UNAVAILABLE on fresh reads (AC-F03-03 second half, fixture-level)", async () => {
      const cookie = await login("B-A-avail", "pw-avail");
      const before = await request(app).get("/api/equipment/fixture-e-one").set("Cookie", `pew_session=${cookie}`);
      expect(before.body.data).toMatchObject({ quantity_available: 1, availability: "AVAILABLE" });

      // Committed checkout state = persisted request + active loan (TEST-F03-02
      // recipe). The real F-05 checkout endpoint triggers this write (Issue #12).
      await insertLoanFixture({ requestId: "req-f03-co", loanId: "loan-f03-co", borrowerId: "u-b-a-avail", equipmentId: "fixture-e-one", quantity: 1, checkedOutBy: "u-c-a-avail" });

      const after = await request(app).get("/api/equipment/fixture-e-one").set("Cookie", `pew_session=${cookie}`);
      expect(after.body.data).toMatchObject({ quantity_total: 1, quantity_available: 0, availability: "UNAVAILABLE" });

      // Persisted: a re-read on the same store returns the same zero state.
      const again = await request(app).get("/api/equipment/fixture-e-one").set("Cookie", `pew_session=${cookie}`);
      expect(again.body.data).toMatchObject({ quantity_available: 0, availability: "UNAVAILABLE" });
    });

    it("a fully returned loan contributes zero held units (edge; D1-03 §3.3)", async () => {
      await insertLoanFixture({ requestId: "req-f03-r", loanId: "loan-f03-r", borrowerId: "u-b-a-avail", equipmentId: "fixture-e-one", quantity: 1, checkedOutBy: "u-c-a-avail", returned: true });
      const cookie = await login("B-A-avail", "pw-avail");
      const detail = await request(app).get("/api/equipment/fixture-e-one").set("Cookie", `pew_session=${cookie}`);
      expect(detail.body.data).toMatchObject({ quantity_total: 1, quantity_available: 1, availability: "AVAILABLE" });
    });
  },
);

/**
 * DEPENDENCY-GATED — AC-06.3-03 data-layer constraints (CHECKs are created by
 * #11/#12 migrations per the handover note). The business layer half of
 * AC-06.3-03 runs above (TEST-F03-05 derives rejects negative/invalid inputs).
 */
describe.skipIf(!HAS_LOAN_RELATIONS)(
  "Non-negative data-layer constraints — dependency-gated on #11/#12 schema (AC-06.3-03)",
  () => {
    it("rejects non-positive loan and request quantities at the database boundary", async () => {
      await insertRequestOnly("req-f03-chk", "u-b-a-avail", "fixture-e-one", 1);
      await expect(
        pool.query(
          `INSERT INTO loans (id, request_id, quantity_borrowed, checked_out_by, checkout_at, due_on)
           VALUES ('loan-chk', 'req-f03-chk', 0, 'u-c-a-avail', now(), current_date + 7)`,
        ),
      ).rejects.toThrow();
      await expect(
        pool.query(
          `INSERT INTO loans (id, request_id, quantity_borrowed, checked_out_by, checkout_at, due_on)
           VALUES ('loan-chk2', 'req-f03-chk', -1, 'u-c-a-avail', now(), current_date + 7)`,
        ),
      ).rejects.toThrow();
      await expect(
        pool.query(
          `INSERT INTO borrowing_requests (id, borrower_id, equipment_id, quantity_requested, created_at)
           VALUES ('req-chk', 'u-b-a-avail', 'fixture-e-one', 0, now())`,
        ),
      ).rejects.toThrow();
    });
  },
);
