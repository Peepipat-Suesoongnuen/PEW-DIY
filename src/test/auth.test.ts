/**
 * RED test design — auth API behavior (TEST-F01-01..07, TEST-F01-12 level).
 * These exercise the AuthService directly against real PostgreSQL before the
 * HTTP layer exists; HTTP-layer tests follow in auth-routes.test.ts once the
 * Express app is wired (contract §3 API shapes).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { AuthService } from "../services/auth";
import { SessionStore } from "../services/session";
import { hashPassword } from "../services/password";
import { createTestContext, resetTestDb, TestContext } from "./harness";

let ctx: TestContext;
let pool: Pool;
let authService: AuthService;
let sessionStore: SessionStore;

async function seedUser(id: string, username: string, role: "BORROWER" | "CUSTODIAN", password: string) {
  const hash = await hashPassword(password);
  // Upsert-safe: delete user row first (cascades to sessions via FK), then insert.
  // Avoid wiping rows another parallel test file may be using.
  await pool.query(`DELETE FROM users WHERE id = $1 OR username = $2`, [id, username]);
  await pool.query(
    `INSERT INTO users (id, username, password_hash, role) VALUES ($1, $2, $3, $4)`,
    [id, username, hash, role],
  );
}

beforeAll(async () => {
  ctx = await createTestContext();
  pool = ctx.pool;
  sessionStore = new SessionStore(pool, 60, 480);
  authService = new AuthService(pool, sessionStore);
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  // No-op: seedUser handles upsert-safe deletes; avoid wiping rows another
  // parallel test file may be using (vitest runs files concurrently on one DB).
});

describe("AuthService.login (AC-F01-01, AC-F01-02, TEST-F01-01/02)", () => {
  it("logs in a seeded Borrower and returns a fresh session with correct identity (TEST-F01-01)", async () => {
    await seedUser("u-b-a-auth", "B-A-auth", "BORROWER", "pw-b-a");
    const result = await authService.login({ username: "B-A-auth", password: "pw-b-a" });
    expect(result.ok).toBe(true);
    expect(result.user).toEqual({ id: "u-b-a-auth", username: "B-A-auth", role: "BORROWER" });
    expect(result.rawSessionId).toBeTruthy();
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it("returns identical INVALID_CREDENTIALS for unknown user and wrong password (AC-F01-02, TEST-F01-02)", async () => {
    await seedUser("u-b-a-auth", "B-A-auth", "BORROWER", "pw-b-a");
    const wrongPassword = await authService.login({ username: "B-A-auth", password: "wrong" });
    const unknownUser = await authService.login({ username: "nonexistent", password: "wrong" });
    expect(wrongPassword.ok).toBe(false);
    expect(unknownUser.ok).toBe(false);
    expect(wrongPassword.errorCode).toBe("INVALID_CREDENTIALS");
    expect(unknownUser.errorCode).toBe("INVALID_CREDENTIALS");
    // Same error code = indistinguishable to the client (no enumeration).
    expect(wrongPassword.errorCode).toBe(unknownUser.errorCode);
  });

  it("rejects malformed payloads and extra identity/role/expiry fields with VALIDATION_ERROR (AC-F01-03, TEST-F01-03)", async () => {
    await seedUser("u-b-a-auth", "B-A-auth", "BORROWER", "pw-b-a");
    const malformed = [
      { username: "B-A-auth" }, // missing password
      { password: "pw-b-a" }, // missing username
      { username: "B-A-auth", password: "" }, // empty password
      { username: "", password: "pw-b-a" }, // empty username
      { username: 123, password: "pw-b-a" }, // wrong type
      { username: "B-A-auth", password: "pw-b-a", role: "CUSTODIAN" }, // extra role field
      { username: "B-A-auth", password: "pw-b-a", user_id: "admin" }, // extra user_id
      { username: "B-A-auth", password: "pw-b-a", borrower_id: "someone-else" }, // extra owner field
    ];
    for (const body of malformed) {
      const result = await authService.login(body);
      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe("VALIDATION_ERROR");
      expect(result.user).toBeUndefined();
    }
  });
});

describe("AuthService.currentUser (AC-F01-04, TEST-F01-04)", () => {
  it("derives identity from the session, not client-supplied claims", async () => {
    await seedUser("u-b-a-auth", "B-A-auth", "BORROWER", "pw-b-a");
    const login = await authService.login({ username: "B-A-auth", password: "pw-b-a" });
    const resolved = await authService.currentUser(login.rawSessionId);
    expect(resolved).toEqual({ id: "u-b-a-auth", username: "B-A-auth", role: "BORROWER" });
    // Tampered session id resolves to null (deny-by-default).
    expect(await authService.currentUser("tampered-session-id")).toBeNull();
    expect(await authService.currentUser(undefined)).toBeNull();
  });
});

describe("AuthService.logout (AC-F01-06, TEST-F01-07)", () => {
  it("revokes server-side and denies replay (TEST-F01-07)", async () => {
    await seedUser("u-b-a-auth", "B-A-auth", "BORROWER", "pw-b-a");
    const login = await authService.login({ username: "B-A-auth", password: "pw-b-a" });
    const rawId = login.rawSessionId!;

    expect(await authService.currentUser(rawId)).not.toBeNull();
    expect(await authService.logout(rawId)).toBe(true);
    expect(await authService.currentUser(rawId)).toBeNull(); // replay denied

    // Second logout of same session reports false (already revoked).
    expect(await authService.logout(rawId)).toBe(false);
  });

  it("revocation survives application restart (TEST-F01-16)", async () => {
    await seedUser("u-b-a-auth", "B-A-auth", "BORROWER", "pw-b-a");
    const login = await authService.login({ username: "B-A-auth", password: "pw-b-a" });
    const rawId = login.rawSessionId!;
    await authService.logout(rawId);

    // "Restart": new store+auth instances against the same durable DB.
    const newStore = new SessionStore(pool, 60, 480);
    const newAuth = new AuthService(pool, newStore);
    expect(await newAuth.currentUser(rawId)).toBeNull(); // still denied
  });
});

describe("AuthService secrets hygiene (AC-F01-10, TEST-F01-12)", () => {
  it("login result and stored rows never expose password or hash", async () => {
    await seedUser("u-b-a-auth", "B-A-auth", "BORROWER", "pw-b-a");
    const login = await authService.login({ username: "B-A-auth", password: "pw-b-a" });
    const serialized = JSON.stringify(login);
    expect(serialized).not.toContain("pw-b-a");
    expect(serialized).not.toContain("$argon2id$");

    const rows = await pool.query("SELECT password_hash FROM users");
    expect(rows.rows[0].password_hash).not.toEqual("pw-b-a");
  });
});
