import { randomBytes, randomUUID } from "crypto";
import { spawn, type ChildProcess } from "child_process";
import { once } from "events";
import { writeFileSync } from "fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Pool } from "pg";
import { createApp } from "../src/routes/auth-routes";
import { AuthService } from "../src/services/auth";
import { SessionStore, type SessionUser } from "../src/services/session";
import { LoanService } from "../src/services/loan";
import { createTestContext, configForTests } from "./harness";
import { getEquipment } from "../src/services/catalog";
import { hashPassword } from "../src/services/password";

let pool: Pool;
let auth: AuthService;
let sessions: SessionStore;
const config = configForTests();
const users: SessionUser[] = [
  { id: "f05-a", username: "f05-a", role: "BORROWER" },
  { id: "f05-b", username: "f05-b", role: "BORROWER" },
  { id: "f05-c", username: "f05-c", role: "CUSTODIAN" },
];
let cookies: string[];
const now = new Date("2026-12-27T17:00:00Z");
const appFor = (options: ConstructorParameters<typeof LoanService>[1] = {}) => createApp({ auth, config,
  loans: new LoanService(pool, { timeZone: "Asia/Bangkok", now: () => now, ...options }) });
const checkout = (id: string, cookie = cookies[2]!, body: unknown = {}, app = appFor()) => request(app)
  .post(`/api/requests/${encodeURIComponent(id)}/checkout`).set("Origin", config.appOrigin).set("Cookie", cookie).send(body);
async function fixture(total = 1, qty = 1, owner = users[0]!.id) {
  const item = "f05-" + randomUUID(), id = "f05-" + randomUUID();
  await pool.query("INSERT INTO equipment VALUES($1,'F05 synthetic','Test','Synthetic',$2)", [item, total]);
  await pool.query("INSERT INTO borrowing_requests(id,borrower_id,equipment_id,quantity_requested) VALUES($1,$2,$3,$4)", [id, owner, item, qty]);
  return { item, id };
}
async function second(item: string, qty = 1) {
  const id = "f05-" + randomUUID();
  await pool.query("INSERT INTO borrowing_requests(id,borrower_id,equipment_id,quantity_requested) VALUES($1,$2,$3,$4)", [id, users[1]!.id, item, qty]);
  return id;
}
async function cleanup() {
  await pool.query("DELETE FROM loans WHERE request_id IN (SELECT id FROM borrowing_requests WHERE borrower_id IN ('f05-a','f05-b'))");
  await pool.query("DELETE FROM borrowing_requests WHERE borrower_id IN ('f05-a','f05-b')");
  await pool.query("DELETE FROM equipment WHERE id LIKE 'f05-%'");
}
beforeAll(async () => {
  ({ pool } = await createTestContext());
  await cleanup();
  for (const u of users) await pool.query(`INSERT INTO users(id,username,password_hash,role) VALUES($1,$2,$3,$4)
    ON CONFLICT(id) DO UPDATE SET password_hash=EXCLUDED.password_hash`, [u.id, u.username, await hashPassword(randomBytes(24).toString("hex")), u.role]);
  sessions = new SessionStore(pool, 60, 480);
  auth = new AuthService(pool, sessions);
  cookies = await Promise.all(users.map(async (u) => `${config.session.cookieName}=${(await sessions.create(u.id)).rawId}`));
});
beforeEach(cleanup);
afterAll(async () => {
  if (!pool) return;
  await cleanup();
  await pool.query("DELETE FROM sessions WHERE user_id IN ('f05-a','f05-b','f05-c')");
  await pool.query("DELETE FROM users WHERE id IN ('f05-a','f05-b','f05-c')");
  await pool.end();
});

describe("F-05 real PostgreSQL/API", () => {
  it("completes the previously deferred request/queue transitions (TEST-F04-06/07)", async () => {
    const { id, item } = await fixture();
    await pool.query("DELETE FROM borrowing_requests WHERE id=$1", [id]);
    const app = appFor();
    const submitted = [];
    for (const cookie of cookies.slice(0, 2)) {
      const response = await request(app).post("/api/requests").set("Origin", config.appOrigin).set("Cookie", cookie!)
        .send({ equipment_id: item, quantity_requested: 1 });
      expect(response.status).toBe(201); submitted.push(response.body.data.id as string);
    }
    expect((await getEquipment(pool, item))!.quantity_available).toBe(1);
    expect((await pool.query("SELECT * FROM loans WHERE request_id=ANY($1::text[])", [submitted])).rowCount).toBe(0);
    expect((await checkout(submitted[0]!)).status).toBe(201);
    expect((await getEquipment(pool, item))!.quantity_available).toBe(0);
    for (const [index, status] of ["CHECKED_OUT", "SUBMITTED"].entries()) {
      expect((await request(app).get(`/api/requests/${submitted[index]}`).set("Cookie", cookies[index]!)).body.data.status).toBe(status);
    }
    expect((await request(app).get("/api/requests").set("Cookie", cookies[2]!)).body.data.map((r: { id: string }) => r.id)).toEqual([submitted[1]]);
    expect((await request(app).get(`/api/requests/${submitted[0]}`).set("Cookie", cookies[2]!)).status).toBe(403);
    expect((await request(app).get(`/api/requests/${submitted[1]}`).set("Cookie", cookies[2]!)).status).toBe(200);
  });
  it("commits correct server fields and due date; fresh request/queue/loan/stock reads (TEST-F05-01/08)", async () => {
    const { id, item } = await fixture();
    const res = await checkout(id);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ request_id: id, borrower_id: users[0]!.id, equipment_id: item,
      quantity_borrowed: 1, checked_out_by: users[2]!.id, checkout_at: now.toISOString(), due_on: "2027-01-04", status: "ACTIVE" });
    const stored = await pool.query("SELECT *,due_on::text AS date FROM loans WHERE id=$1", [res.body.data.id]);
    expect(stored.rows[0].date).toBe("2027-01-04");
    expect(stored.rows[0].returned_at).toBeNull();
    expect((await getEquipment(pool, item))!.quantity_available).toBe(0);
    const app = appFor();
    const read = await request(app).get(`/api/requests/${id}`).set("Cookie", cookies[0]!);
    expect(read.body.data.status).toBe("CHECKED_OUT");
    expect((await request(app).get("/api/requests").set("Cookie", cookies[2]!)).body.data).toEqual([]);
    expect((await request(app).get(`/api/requests/${id}`).set("Cookie", cookies[2]!)).status).toBe(403);
    expect((await request(app).get(`/api/loans/${res.body.data.id}`).set("Cookie", cookies[0]!)).body).toEqual(res.body);
  });
  it("rejects unavailable and repeated requests without mutation (TEST-F05-02/03)", async () => {
    const { id, item } = await fixture(); const other = await second(item);
    expect((await checkout(id)).status).toBe(201);
    expect((await checkout(other)).body.error.code).toBe("INSUFFICIENT_AVAILABILITY");
    expect((await checkout(id)).body.error.code).toBe("ALREADY_CHECKED_OUT");
    expect((await pool.query("SELECT * FROM loans WHERE request_id=ANY($1::text[])", [[id, other]])).rowCount).toBe(1);
  });
  it("rolls back failure after INSERT, forbids dirty availability reads, then retries (TEST-F05-06 / F03-10)", async () => {
    const { id, item } = await fixture();
    let entered!: () => void, release!: () => void;
    const inserted = new Promise<void>((r) => { entered = r; });
    const barrier = new Promise<void>((r) => { release = r; });
    const attempt = checkout(id, cookies[2], {}, appFor({ afterInsert: async () => { entered(); await barrier; throw new Error("injected"); } })).then((r) => r);
    await inserted;
    try {
      expect((await getEquipment(pool, item))!.quantity_available).toBe(1);
      expect((await pool.query("SELECT * FROM loans WHERE request_id=$1", [id])).rowCount).toBe(0);
    } finally { release(); }
    expect((await attempt).status).toBe(500);
    expect((await pool.query("SELECT * FROM loans WHERE request_id=$1", [id])).rowCount).toBe(0);
    expect((await getEquipment(pool, item))!.quantity_available).toBe(1);
    expect((await checkout(id)).status).toBe(201);
  });
  it("enforces authentication, role, ownership and trusted origin (TEST-F05-09/10)", async () => {
    const a = await fixture(); const b = await fixture(1, 1, users[1]!.id);
    expect((await checkout(a.id, "")).status).toBe(401);
    expect((await checkout(a.id, cookies[0])).status).toBe(403);
    expect((await request(appFor()).post(`/api/requests/${a.id}/checkout`).set("Cookie", cookies[2]!).set("Origin", "https://hostile.invalid").send({})).status).toBe(403);
    const la = (await checkout(a.id)).body.data; const lb = (await checkout(b.id)).body.data;
    const app = appFor();
    expect((await request(app).get("/api/loans")).status).toBe(401);
    expect((await request(app).get(`/api/loans/${la.id}`)).status).toBe(401);
    expect((await request(app).get("/api/loans").set("Cookie", cookies[0]!)).body.data.map((l: {id: string}) => l.id)).toEqual([la.id]);
    const foreign = await request(app).get(`/api/loans/${lb.id}`).set("Cookie", cookies[0]!);
    expect(foreign.status).toBe(403); expect(JSON.stringify(foreign.body)).not.toContain(users[1]!.id);
    for (const path of ["/api/loans", `/api/loans/${la.id}`]) expect((await request(app).get(path).set("Cookie", cookies[2]!)).status).toBe(403);
    expect((await request(app).get("/api/loans/missing").set("Cookie", cookies[0]!)).status).toBe(404);
  });
  it("rejects injected fields, non-object bodies and malformed IDs (TEST-F05-13)", async () => {
    const { id } = await fixture();
    for (const field of ["quantity_borrowed", "due_on", "borrower_id", "checked_out_by", "status", "request_id"]) {
      expect((await checkout(id, cookies[2], { [field]: "forged" })).status).toBe(400);
    }
    for (const body of [[], null, { extra: 1 }]) expect((await checkout(id, cookies[2], body)).status).toBe(400);
    expect((await checkout("\0")).status).toBe(400);
    expect((await checkout("missing")).status).toBe(404);
    expect((await pool.query("SELECT * FROM loans WHERE request_id=$1", [id])).rowCount).toBe(0);
  });
  it("fulfills multiple units with no extra borrower cap and checks stock again (TEST-F05-14/16)", async () => {
    const a = await fixture(3, 2); const b = await second(a.item, 2);
    expect((await checkout(a.id)).body.data.quantity_borrowed).toBe(2);
    expect((await checkout(b)).status).toBe(409);
    const c = await second(a.item, 1);
    expect((await checkout(c)).status).toBe(201);
    expect((await getEquipment(pool, a.item))!.quantity_available).toBe(0);
    const pooled = await fixture(3); const another = await second(pooled.item);
    expect((await checkout(pooled.id)).status).toBe(201); expect((await checkout(another)).status).toBe(201);
    expect((await getEquipment(pool, pooled.item))!.quantity_available).toBe(1);
    const unlimited = await fixture(200, 200);
    expect((await checkout(unlimited.id)).body.data.quantity_borrowed).toBe(200);
  });
  it("fails closed when business timezone has not been configured", async () => {
    const { id } = await fixture();
    expect((await checkout(id, cookies[2], {}, appFor({ timeZone: undefined }))).status).toBe(503);
    expect((await pool.query("SELECT * FROM loans WHERE request_id=$1", [id])).rowCount).toBe(0);
  });
  it("backs the relation with FK, unique and positive-quantity constraints", async () => {
    const { id } = await fixture();
    const insert = (requestId: string, quantity: number, actor = users[2]!.id) => pool.query(
      "INSERT INTO loans(id,request_id,quantity_borrowed,checked_out_by,checkout_at,due_on) VALUES($1,$2,$3,$4,now(),current_date+7)",
      [randomUUID(), requestId, quantity, actor]);
    await expect(insert(id, 0)).rejects.toMatchObject({ code: "23514" });
    await expect(insert("missing-request", 1)).rejects.toMatchObject({ code: "23503" });
    await expect(insert(id, 1, "missing-actor")).rejects.toMatchObject({ code: "23503" });
    expect((await checkout(id)).status).toBe(201);
    await expect(insert(id, 1)).rejects.toMatchObject({ code: "23505" });
  });
  it("restricts Borrower reads to active records, with no return endpoint", async () => {
    const { id } = await fixture(); const loan = (await checkout(id)).body.data;
    // Future-lifecycle fixture only; no application return operation is added.
    await pool.query("UPDATE loans SET returned_at=now(),returned_by=$1 WHERE id=$2", [users[2]!.id, loan.id]);
    expect((await request(appFor()).get("/api/loans").set("Cookie", cookies[0]!)).body.data).toEqual([]);
    expect((await request(appFor()).get(`/api/loans/${loan.id}`).set("Cookie", cookies[0]!)).status).toBe(404);
  });
  it("persists API-created loan across two actual app processes (TEST-F05-11)", async () => {
    const { id, item } = await fixture();
    let worker = await startWorker("production");
    let loan: unknown;
    try {
      const response = await worker.post(id); expect(response.status).toBe(201); loan = (await response.json()).data;
    } finally { await worker.stop(); }
    worker = await startWorker("production");
    try {
      const response = await fetch(`${worker.origin}/api/loans`, { headers: { Cookie: cookies[0]! } });
      expect((await response.json()).data).toEqual([loan]);
      expect((await getEquipment(pool, item))!.quantity_available).toBe(0);
      expect((await worker.post(id)).status).toBe(409);
    } finally { await worker.stop(); }
  });
  it("serializes N=50 independent two-worker races and a same-request race (TEST-F05-04/05)", async () => {
    const workers = await Promise.all([startWorker("race"), startWorker("race")]);
    const outcomes: number[][] = [];
    try {
      for (let n = 0; n < 51; n++) {
        const { id, item } = await fixture(); const other = n === 50 ? id : await second(item);
        const arrivals = workers.map((w) => w.barrier());
        const calls = workers.map((w, index) => w.post(index ? other : id));
        await Promise.all(arrivals); workers.forEach((w) => w.proc.send("release"));
        const responses = await Promise.all(calls);
        const statuses = responses.map((r) => r.status).sort(); outcomes.push(statuses);
        expect(statuses).toEqual([201, 409]);
        if (n === 50) expect((await responses.find((r) => r.status === 409)!.json()).error.code).toBe("ALREADY_CHECKED_OUT");
        expect((await pool.query(`SELECT count(*)::int AS count,sum(quantity_borrowed)::int AS held FROM loans l
          JOIN borrowing_requests r ON r.id=l.request_id WHERE r.equipment_id=$1`, [item])).rows[0]).toEqual({ count: 1, held: 1 });
        expect((await getEquipment(pool, item))!.quantity_available).toBe(0);
      }
      console.log("F05 independent worker PIDs", workers.map((w) => w.proc.pid), "race outcomes", JSON.stringify(outcomes));
      if (process.env.F05_RACE_EVIDENCE) writeFileSync(process.env.F05_RACE_EVIDENCE, JSON.stringify({
        workers: workers.map((w) => w.proc.pid), database: "PostgreSQL " + (await pool.query("SHOW server_version")).rows[0].server_version, distinctRequestRaces: 50,
        sameRequestRaces: 1, outcomes, invariant: "one loan, held=1, available=0 in every race", timestamp: new Date().toISOString(),
      }, null, 2) + "\n");
    } finally { await Promise.all(workers.map((w) => w.stop())); }
  }, 60_000);
});

async function startWorker(mode = "normal") {
  const production = mode === "production";
  const proc: ChildProcess = spawn(process.execPath, ["--import", "tsx", production ? "server/src/index.ts" : "server/tests/fixtures/loan-worker.ts"], {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL!, F05_TEST_MODE: mode,
      ...(production ? { PORT: "3158", APP_ORIGIN: "http://127.0.0.1:3158" } : {}) },
    stdio: ["ignore", "ignore", "pipe", "ipc"], windowsHide: true,
  });
  const ready = production ? await (async () => {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline && proc.exitCode === null) {
      try { if ((await fetch("http://127.0.0.1:3158/login.html")).ok) return 3158; } catch { /* starting */ }
      await new Promise((r) => setTimeout(r, 100));
    }
    proc.kill(); throw new Error("Production app startup timed out");
  })() : await new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => { proc.kill(); reject(new Error("Worker startup timed out")); }, 15000);
    proc.once("error", reject); proc.once("exit", () => reject(new Error("Worker exited before ready")));
    proc.once("message", (m) => { clearTimeout(timer); resolve((m as { port: number }).port); });
  });
  const origin = `http://127.0.0.1:${ready}`;
  return { proc, origin,
    barrier: () => new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { proc.off("message", listener); reject(new Error("Race barrier timed out")); }, 10000);
      const listener = (m: unknown) => { if (m === "barrier") { clearTimeout(timer); proc.off("message", listener); resolve(); } };
      proc.on("message", listener);
    }),
    post: (id: string) => fetch(`${origin}/api/requests/${encodeURIComponent(id)}/checkout`, {
      method: "POST", headers: { Cookie: cookies[2]!, Origin: origin, "Content-Type": "application/json" }, body: "{}",
    }),
    stop: async () => { const exited = once(proc, "exit"); proc.kill(); await exited; },
  };
}
