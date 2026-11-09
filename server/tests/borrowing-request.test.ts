import { randomBytes } from "crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Pool } from "pg";
import type express from "express";
import { createApp } from "../src/routes/auth-routes";
import { loadConfig } from "../src/config/config";
import { AuthService } from "../src/services/auth";
import { SessionStore } from "../src/services/session";
import { hashPassword } from "../src/services/password";
import { BorrowingRequestService } from "../src/services/borrowing-request";
import { createTestContext } from "./harness";
import { migrate } from "../src/db/migrations";

let pool: Pool;
let app: express.Application;
let auth: AuthService;
let config: ReturnType<typeof loadConfig>;
const passwords = [randomBytes(24).toString("hex"), randomBytes(24).toString("hex"), randomBytes(24).toString("hex")];
const ids = ["f04-b-a", "f04-b-b", "f04-c-a"];
let cookies: string[];
const one = "f04/item%2Fone#test";
const many = "f04-many";
const zero = "f04-zero";

async function login(index: number): Promise<string> {
  const result = await request(app).post("/api/auth/login").set("Origin", config.appOrigin)
    .send({ username: ids[index], password: passwords[index] });
  expect(result.status).toBe(200);
  const header = result.headers["set-cookie"] as unknown as string[];
  return header[0]!.split(";")[0]!;
}
function post(body: unknown, cookie = cookies[0], target = app) {
  return request(target).post("/api/requests").set("Origin", config.appOrigin).set("Cookie", cookie!).send(body);
}
const body = (item = one, quantity = 1) => ({ equipment_id: item, quantity_requested: quantity });

beforeAll(async () => {
  ({ pool } = await createTestContext());
  config = loadConfig();
  auth = new AuthService(pool, new SessionStore(pool, 60, 480));
  app = createApp({ auth, config });
  for (const [i, id] of ids.entries()) {
    await pool.query("INSERT INTO users(id,username,password_hash,role) VALUES($1,$1,$2,$3)",
      [id, await hashPassword(passwords[i]!), i === 2 ? "CUSTODIAN" : "BORROWER"]);
  }
  cookies = await Promise.all(ids.map((_, i) => login(i)));
});

beforeEach(async () => {
  await pool.query("DELETE FROM borrowing_requests WHERE borrower_id = ANY($1::text[])", [ids]);
  for (const [id, total] of [[one, 1], [many, 3], [zero, 0]] as const) {
    await pool.query(`INSERT INTO equipment(id,name,description,category,quantity_total) VALUES($1,$1,'Fixture','Synthetic',$2)
      ON CONFLICT(id) DO UPDATE SET quantity_total=EXCLUDED.quantity_total`, [id, total]);
  }
});

afterAll(async () => {
  if (!pool) return;
  await pool.query("DELETE FROM borrowing_requests WHERE borrower_id = ANY($1::text[])", [ids]);
  await pool.query("DELETE FROM equipment WHERE id = ANY($1::text[])", [[one, many, zero]]);
  await pool.query("DELETE FROM sessions WHERE user_id = ANY($1::text[])", [ids]);
  await pool.query("DELETE FROM users WHERE id = ANY($1::text[])", [ids]);
  await pool.end();
});

describe("F-04 real API/PostgreSQL", () => {
  it("persists server-owned request fields, opaque item ID and fresh retrieval (TEST-F04-01)", async () => {
    const res = await post(body());
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ borrower_id: ids[0], equipment_id: one, quantity_requested: 1, status: "SUBMITTED" });
    expect(typeof res.body.data.id).toBe("string");
    expect(Number.isNaN(Date.parse(res.body.data.created_at))).toBe(false);
    const read = await request(app).get(`/api/requests/${encodeURIComponent(res.body.data.id)}`).set("Cookie", cookies[0]!);
    expect(read.body).toEqual(res.body);
    const stored = await pool.query("SELECT * FROM borrowing_requests WHERE id=$1", [res.body.data.id]);
    expect(stored.rowCount).toBe(1);
  });

  it("rejects unavailable equipment without persistence (TEST-F04-02)", async () => {
    const res = await post(body(zero));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INSUFFICIENT_AVAILABILITY");
    expect((await pool.query("SELECT * FROM borrowing_requests WHERE equipment_id=$1", [zero])).rowCount).toBe(0);
  });

  it.each([undefined, 0, -1, 1.5, null, true, "1", 2_147_483_648])("rejects invalid quantity %s (TEST-F04-03)", async (quantity) => {
    expect((await post({ equipment_id: one, quantity_requested: quantity })).status).toBe(400);
    expect((await pool.query("SELECT * FROM borrowing_requests WHERE equipment_id=$1", [one])).rowCount).toBe(0);
  });

  it.each(["borrower_id", "status", "created_at", "id", "loan_id"])("rejects injected %s (TEST-F04-04)", async (key) => {
    expect((await post({ ...body(), [key]: "forged" })).status).toBe(400);
  });

  it("rejects absent equipment and malformed body (TEST-F04-03/04)", async () => {
    expect((await post(body("unknown-item"))).status).toBe(404);
    for (const value of [{}, [], { equipment_id: one }, { ...body(), equipment_id: null }]) {
      expect((await post(value)).status).toBe(400);
    }
    const malformed = await request(app).post("/api/requests").set("Origin", config.appOrigin)
      .set("Cookie", cookies[0]!).set("Content-Type", "application/json").send("{broken");
    expect(malformed.status).toBe(400);
    expect(malformed.type).toMatch(/json/);
  });

  it("filters lists and forbids another borrower's detail (TEST-F04-05/14)", async () => {
    const a = await post(body());
    const b = await post(body(), cookies[1]);
    const list = await request(app).get("/api/requests").set("Cookie", cookies[0]!);
    expect(list.body.data.map((r: { id: string }) => r.id)).toEqual([a.body.data.id]);
    const foreign = await request(app).get(`/api/requests/${b.body.data.id}`).set("Cookie", cookies[0]!);
    expect(foreign.status).toBe(403);
    expect(JSON.stringify(foreign.body)).not.toContain(ids[1]);
    expect((await request(app).get("/api/requests/missing").set("Cookie", cookies[0]!)).status).toBe(404);
  });

  it("allows the submitted queue, denies Custodian creation before input validation (TEST-F04-06)", async () => {
    const created = await post(body());
    const queue = await request(app).get("/api/requests").set("Cookie", cookies[2]!);
    expect(queue.body.data.map((r: { id: string }) => r.id)).toContain(created.body.data.id);
    expect((await request(app).get(`/api/requests/${created.body.data.id}`).set("Cookie", cookies[2]!)).status).toBe(200);
    expect((await post({ invalid: true }, cookies[2])).status).toBe(403);
  });

  it("does not reserve units for repeated or competing requests (TEST-F04-07 request half; BR-12)", async () => {
    for (const cookie of [cookies[0], cookies[1], cookies[0]]) expect((await post(body(), cookie)).status).toBe(201);
    const stock = await request(app).get(`/api/equipment/${encodeURIComponent(one)}`).set("Cookie", cookies[0]!);
    expect(stock.body.data.quantity_available).toBe(1);
  });

  it("enforces approved multi-unit bounds with no additional per-user cap (TEST-F04-10)", async () => {
    expect((await post(body(many, 3))).status).toBe(201);
    expect((await post(body(many, 3))).status).toBe(201);
    const res = await post(body(many, 4));
    expect(res.status).toBe(409);
    expect((await pool.query("SELECT count(*)::int AS n FROM borrowing_requests WHERE equipment_id=$1", [many])).rows[0].n).toBe(2);
  });

  it("denies all anonymous routes and hostile-origin submissions (TEST-F04-11)", async () => {
    const created = await post(body());
    for (const path of ["/api/requests", `/api/requests/${created.body.data.id}`]) {
      expect((await request(app).get(path)).status).toBe(401);
    }
    expect((await request(app).post("/api/requests").set("Origin", config.appOrigin).send(body())).status).toBe(401);
    expect((await request(app).post("/api/requests").set("Cookie", cookies[0]!).set("Origin", "https://hostile.invalid").send(body())).status).toBe(403);
  });

  it("rolls back an inserted request on failure and permits a clean retry (TEST-F04-12)", async () => {
    const broken = createApp({ auth, config, requests: new BorrowingRequestService(pool, {
      afterInsert: async () => { throw new Error("private SQL diagnostic must not escape"); },
    }) });
    const res = await post(body(), cookies[0], broken);
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("private SQL");
    expect((await pool.query("SELECT * FROM borrowing_requests WHERE equipment_id=$1", [one])).rowCount).toBe(0);
    expect((await post(body())).status).toBe(201);
  });

  it("denies invalid and logged-out credentials on every new request route", async () => {
    const created = await post(body());
    const fresh = await login(0);
    expect((await request(app).post("/api/auth/logout").set("Cookie", fresh).set("Origin", config.appOrigin)).status).toBe(204);
    for (const cookie of [fresh, "pew_session=invalid-session"] ) {
      for (const path of ["/api/requests", `/api/requests/${created.body.data.id}`]) {
        const res = await request(app).get(path).set("Cookie", cookie);
        expect(res.status).toBe(401);
        expect(res.body.data).toBeUndefined();
      }
      expect((await post(body(), cookie)).status).toBe(401);
    }
  });

  it("repeated migrations preserve requests and foreign keys protect their history", async () => {
    await post(body());
    await migrate(pool);
    expect((await pool.query("SELECT * FROM borrowing_requests WHERE equipment_id=$1", [one])).rowCount).toBe(1);
    await expect(pool.query("DELETE FROM equipment WHERE id=$1", [one])).rejects.toMatchObject({ code: "23503" });
    await expect(pool.query("DELETE FROM users WHERE id=$1", [ids[0]])).rejects.toMatchObject({ code: "23503" });
  });
});
