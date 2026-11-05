/**
 * HTTP integration tests — real Express app + real PostgreSQL (TEST-F01-01..07).
 * Covers the contract §3 API shapes: login, current-user, logout, error codes,
 * cookie transport, and replay denial.
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

let ctx: TestContext;
let pool: Pool;
let app: express.Application;
let config: AppConfig;

async function seedUser(id: string, username: string, role: "BORROWER" | "CUSTODIAN", password: string) {
  const hash = await hashPassword(password);
  await pool.query(`DELETE FROM sessions WHERE user_id = $1`, [id]);
  await pool.query(`DELETE FROM users WHERE id = $1 OR username = $2`, [id, username]);
  await pool.query(
    `INSERT INTO users (id, username, password_hash, role) VALUES ($1, $2, $3, $4)`,
    [id, username, hash, role],
  );
}

function parseCookies(setCookie: string | string[] | undefined): string {
  if (!setCookie) return "";
  const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const c of arr) {
    const m = c.match(/^pew_session=([^;]+)/);
    if (m) return m[1];
  }
  return "";
}

beforeAll(async () => {
  ctx = await createTestContext();
  pool = ctx.pool;
  config = loadConfig({
    ...process.env,
    SESSION_IDLE_MINUTES: "60",
    SESSION_ABSOLUTE_MINUTES: "480",
  });
  const sessions = new SessionStore(pool, config.session.idleMinutes, config.session.absoluteMinutes);
  const auth = new AuthService(pool, sessions);
  app = createApp({ auth, config });
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await pool.query(`DELETE FROM sessions WHERE user_id LIKE '%-http'`);
  await pool.query(`DELETE FROM users WHERE id LIKE '%-http' OR username LIKE '%-http'`);
});

describe("POST /api/auth/login (TEST-F01-01/02/03)", () => {
  it("returns 200 with data.user and sets a session cookie (TEST-F01-01)", async () => {
    await seedUser("u-b-a-http", "B-A-http", "BORROWER", "pw-http");
    const res = await request(app).post("/api/auth/login").set("Origin", config.appOrigin).send({ username: "B-A-http", password: "pw-http" });
    expect(res.status).toBe(200);
    expect(res.body.data.user).toEqual({ id: "u-b-a-http", username: "B-A-http", role: "BORROWER" });
    expect(res.body.data.user).not.toHaveProperty("password");
    expect(res.body.data.user).not.toHaveProperty("password_hash");
    const cookie = parseCookies(res.headers["set-cookie"]);
    expect(cookie).toBeTruthy();
  });

  it("returns 401 INVALID_CREDENTIALS for unknown user and wrong password identically (TEST-F01-02)", async () => {
    await seedUser("u-b-a-http", "B-A-http", "BORROWER", "pw-http");
    const wrongPw = await request(app).post("/api/auth/login").set("Origin", config.appOrigin).send({ username: "B-A-http", password: "wrong" });
    const unknown = await request(app).post("/api/auth/login").set("Origin", config.appOrigin).send({ username: "nonexistent-http", password: "wrong" });
    expect(wrongPw.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrongPw.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(unknown.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("returns 400 VALIDATION_ERROR for malformed or extra-field payloads (TEST-F01-03)", async () => {
    await seedUser("u-b-a-http", "B-A-http", "BORROWER", "pw-http");
    const cases = [
      { username: "B-A-http" },
      { password: "pw-http" },
      { username: "B-A-http", password: "pw-http", role: "CUSTODIAN" },
      { username: "B-A-http", password: "pw-http", user_id: "admin" },
    ];
    for (const payload of cases) {
      const res = await request(app).post("/api/auth/login").set("Origin", config.appOrigin).send(payload);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
  });
});

describe("GET /api/auth/me (TEST-F01-04/05)", () => {
  it("returns 200 with user identity when authenticated (TEST-F01-04)", async () => {
    await seedUser("u-b-a-http", "B-A-http", "BORROWER", "pw-http");
    const login = await request(app).post("/api/auth/login").set("Origin", config.appOrigin).send({ username: "B-A-http", password: "pw-http" });
    const cookie = parseCookies(login.headers["set-cookie"]);
    const me = await request(app).get("/api/auth/me").set("Cookie", `pew_session=${cookie}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user).toEqual({ id: "u-b-a-http", username: "B-A-http", role: "BORROWER" });
  });

  it("returns 401 UNAUTHENTICATED without a session (TEST-F01-05)", async () => {
    const me = await request(app).get("/api/auth/me");
    expect(me.status).toBe(401);
    expect(me.body.error.code).toBe("UNAUTHENTICATED");
    expect(me.body.data).toBeUndefined();
  });
});

describe("POST /api/auth/logout (TEST-F01-06/07)", () => {
  it("returns 204, clears cookie, and denies replay (TEST-F01-07)", async () => {
    await seedUser("u-b-a-http", "B-A-http", "BORROWER", "pw-http");
    const login = await request(app).post("/api/auth/login").set("Origin", config.appOrigin).send({ username: "B-A-http", password: "pw-http" });
    const cookie = parseCookies(login.headers["set-cookie"]);

    const logout = await request(app).post("/api/auth/logout").set("Origin", config.appOrigin).set("Cookie", `pew_session=${cookie}`).send({});
    expect(logout.status).toBe(204);
    const cleared = parseCookies(logout.headers["set-cookie"]);
    expect(cleared).toBe("");

    const replay = await request(app).get("/api/auth/me").set("Cookie", `pew_session=${cookie}`);
    expect(replay.status).toBe(401);
  });

  it("returns 401 for logout without authentication (TEST-F01-05)", async () => {
    const res = await request(app).post("/api/auth/logout").set("Origin", config.appOrigin).send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("Regression — safe error envelopes (TEST-F01-03/06/14)", () => {
  it("malformed JSON body returns 400 JSON envelope, never HTML (TEST-F01-03)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{bad json");
    expect(res.status).toBe(400);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("object-typed session cookie is denied with 401 JSON, not 500 HTML (TEST-F01-06)", async () => {
    // cookie-parser decodes `j%3A%7B%7D` into an object via its JSON-cookie
    // convention; the guard must type-check before hashing.
    const res = await request(app).get("/api/auth/me").set("Cookie", "pew_session=j%3A%7B%7D");
    expect(res.status).toBe(401);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("auth storage failure returns safe 500/503 JSON without internal details (TEST-F01-14)", async () => {
    const brokenPool = {
      query: async () => {
        throw new Error("connection refused: secret-dsn-detail-should-not-leak");
      },
    } as never;
    const brokenStore = new SessionStore(brokenPool, 60, 480);
    const brokenAuth = new AuthService(brokenPool, brokenStore);
    const brokenApp = createApp({ auth: brokenAuth, config });

    const res = await request(brokenApp).get("/api/auth/me").set("Cookie", "pew_session=any-value");
    // Contract TEST-F01-14 allows "Safe 500/503 shared response"; the shared
    // convention maps DB unavailability to 503 SERVICE_UNAVAILABLE (f-02 §4).
    expect([500, 503]).toContain(res.status);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(["INTERNAL_ERROR", "SERVICE_UNAVAILABLE"]).toContain(res.body.error.code);
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain("secret-dsn-detail-should-not-leak");
    expect(serialized).not.toContain("TypeError");
    expect(serialized).not.toContain("at ");
  });
});

describe("Regression — anti-CSRF origin enforcement (TEST-F01-15)", () => {
  it("cross-origin logout is denied 403 and does NOT revoke the session (forced-logout defense)", async () => {
    await seedUser("u-b-a-http", "B-A-http", "BORROWER", "pw-http");
    const login = await request(app).post("/api/auth/login").set("Origin", config.appOrigin).send({ username: "B-A-http", password: "pw-http" });
    const cookie = parseCookies(login.headers["set-cookie"]);

    const attack = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", `pew_session=${cookie}`)
      .set("Origin", "http://evil.example")
      .send({});
    expect(attack.status).toBe(403);
    expect(attack.body.error.code).toBe("FORBIDDEN");

    // The attack must have no side effect: session is still valid.
    const me = await request(app).get("/api/auth/me").set("Cookie", `pew_session=${cookie}`);
    expect(me.status).toBe(200);
  });

  it("same-origin state-changing request is allowed", async () => {
    await seedUser("u-b-a-http", "B-A-http", "BORROWER", "pw-http");
    const login = await request(app).post("/api/auth/login").set("Origin", config.appOrigin).send({ username: "B-A-http", password: "pw-http" });
    const cookie = parseCookies(login.headers["set-cookie"]);

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", `pew_session=${cookie}`)
      .set("Origin", config.appOrigin)
      .send({});
    expect(res.status).toBe(204);
  });
});

describe("Regression — missing anti-CSRF evidence (TEST-F01-15, review round 2)", () => {
  it("logout with neither Origin nor Referer is denied 403 and does NOT revoke the session", async () => {
    await seedUser("u-b-a-http", "B-A-http", "BORROWER", "pw-http");
    const login = await request(app)
      .post("/api/auth/login")
      .set("Origin", config.appOrigin)
      .send({ username: "B-A-http", password: "pw-http" });
    const cookie = parseCookies(login.headers["set-cookie"]);

    // No Origin, no Referer: absent anti-CSRF evidence must be denied
    // before the handler runs (contract TEST-F01-15).
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", `pew_session=${cookie}`)
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");

    // No side effect: the session must remain valid after the rejection.
    const me = await request(app).get("/api/auth/me").set("Cookie", `pew_session=${cookie}`);
    expect(me.status).toBe(200);
  });
});
