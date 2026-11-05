/**
 * RED test design — session store behavior (TEST-F01-07/08/16 level).
 * Written against the real PostgreSQL test database before application
 * integration is complete; failures prove behavior gaps, not setup problems.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { SessionStore } from "../src/services/session";
import { createTestContext, resetTestDb, TestContext } from "./harness";

let ctx: TestContext;
let pool: Pool;

async function seedUser(id: string, username: string, role: "BORROWER" | "CUSTODIAN") {
  // Upsert-safe: delete first to avoid duplicate-key under parallel test files
  // sharing the same test database (vitest runs files in parallel).
  await pool.query(`DELETE FROM sessions WHERE user_id = $1`, [id]);
  await pool.query(`DELETE FROM users WHERE id = $1 OR username = $2`, [id, username]);
  await pool.query(
    `INSERT INTO users (id, username, password_hash, role) VALUES ($1, $2, $3, $4)`,
    [id, username, "test-hash-not-a-real-one", role],
  );
}

beforeAll(async () => {
  ctx = await createTestContext();
  pool = ctx.pool;
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  // Delete only this file's namespace (avoid wiping rows other parallel test
  // files may be using — vitest runs files concurrently on one database).
  await pool.query(`DELETE FROM sessions WHERE user_id LIKE 'u-b-a-sess%' OR user_id LIKE 'u-b-b-sess%'`);
  await pool.query(`DELETE FROM users WHERE id LIKE 'u-b-a-sess%' OR id LIKE 'u-b-b-sess%' OR username LIKE 'B-%-sess'`);
});

describe("SessionStore (D2: server session, durable revocation)", () => {
  it("creates a session whose raw id resolves to the correct user (TEST-F01-01 support)", async () => {
    await seedUser("u-b-a-sess", "B-A-sess", "BORROWER");
    const store = new SessionStore(pool, 60, 480);
    const { rawId } = await store.create("u-b-a-sess");
    const resolved = await store.resolve(rawId);
    expect(resolved).not.toBeNull();
    expect(resolved!.user).toEqual({ id: "u-b-a-sess", username: "B-A-sess", role: "BORROWER" });
  });

  it("does not store the raw session id anywhere (digest-only persistence)", async () => {
    await seedUser("u-b-a-sess", "B-A-sess", "BORROWER");
    const store = new SessionStore(pool, 60, 480);
    const { rawId } = await store.create("u-b-a-sess");
    const rows = await pool.query("SELECT session_key FROM sessions");
    for (const row of rows.rows) {
      expect(row.session_key).not.toEqual(rawId);
    }
  });

  it("rejects unknown, empty and tampered session ids (TEST-F01-05/06 support)", async () => {
    const store = new SessionStore(pool, 60, 480);
    expect(await store.resolve(undefined)).toBeNull();
    expect(await store.resolve("")).toBeNull();
    expect(await store.resolve("not-a-real-session-id")).toBeNull();
  });

  it("revocation denies replay immediately and survives application restart (TEST-F01-07, TEST-F01-16)", async () => {
    await seedUser("u-b-a-sess", "B-A-sess", "BORROWER");
    const store = new SessionStore(pool, 60, 480);
    const { rawId } = await store.create("u-b-a-sess");
    expect(await store.resolve(rawId)).not.toBeNull();

    expect(await store.revoke(rawId)).toBe(true);
    expect(await store.resolve(rawId)).toBeNull(); // replay denied

    // "Restart": a brand-new store instance against the same durable store.
    const restarted = new SessionStore(pool, 60, 480);
    expect(await restarted.resolve(rawId)).toBeNull();
    // Revoking again reports false: already revoked (no double-effects).
    expect(await restarted.revoke(rawId)).toBe(false);
  });

  it("enforces idle expiry at the boundary using the injectable clock (TEST-F01-08)", async () => {
    await seedUser("u-b-a-sess", "B-A-sess", "BORROWER");
    let now = new Date("2026-11-05T10:00:00Z");
    const store = new SessionStore(pool, 60, 480, () => now);
    const { rawId } = await store.create("u-b-a-sess");

    // Session created at 10:00 with idle=60 → expires at 11:00 if untouched.
    // Test the untouched path: no activity for 60+ minutes → expired.
    now = new Date("2026-11-05T11:01:00Z"); // past 11:00 expiry with no touch
    expect(await store.resolve(rawId)).toBeNull();

    // Sliding test: each touch extends 60m from that moment.
    await resetTestDb(pool);
    await seedUser("u-b-a-sess", "B-A-sess", "BORROWER");
    now = new Date("2026-11-05T10:00:00Z");
    const { rawId: raw2 } = await store.create("u-b-a-sess");
    now = new Date("2026-11-05T10:30:00Z");
    expect(await store.resolve(raw2)).not.toBeNull(); // touch → extends to 11:30
    now = new Date("2026-11-05T11:29:00Z");
    expect(await store.resolve(raw2)).not.toBeNull(); // touch again → extends to 12:29
    now = new Date("2026-11-05T12:30:00Z"); // past 12:29 (60m after 11:29 touch)
    expect(await store.resolve(raw2)).toBeNull(); // expired after idle
  });

  it("enforces the absolute cap even with continuous activity (TEST-F01-08)", async () => {
    await seedUser("u-b-a-sess", "B-A-sess", "BORROWER");
    let now = new Date("2026-11-05T10:00:00Z");
    const store = new SessionStore(pool, 60, 120, () => now); // absolute 2h
    const { rawId } = await store.create("u-b-a-sess");

    // Keep touching the session every 30 minutes (within idle window).
    now = new Date("2026-11-05T10:30:00Z");
    expect(await store.resolve(rawId)).not.toBeNull();
    now = new Date("2026-11-05T11:00:00Z");
    expect(await store.resolve(rawId)).not.toBeNull();
    now = new Date("2026-11-05T11:30:00Z");
    expect(await store.resolve(rawId)).not.toBeNull();

    now = new Date("2026-11-05T12:00:00Z"); // at absolute cap
    expect(await store.resolve(rawId)).toBeNull();
  });

  it("sliding idle extension never exceeds the absolute cap", async () => {
    await seedUser("u-b-a-sess", "B-A-sess", "BORROWER");
    let now = new Date("2026-11-05T10:00:00Z");
    const store = new SessionStore(pool, 90, 120, () => now); // idle > remaining absolute
    const { rawId } = await store.create("u-b-a-sess");
    now = new Date("2026-11-05T10:30:00Z");
    const rec = await store.resolve(rawId);
    expect(rec).not.toBeNull();
    expect(rec!.expiresAt.getTime()).toBeLessThanOrEqual(rec!.absoluteExpiresAt.getTime());
  });
});
