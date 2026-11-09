/**
 * Real application-process restart evidence (TEST-F02-10 / AC-06.2-03,
 * AC-F02-08) — PR #27 review: the in-suite "new app instance" check does not
 * prove process restart; this file spawns the ACTUAL application process
 * (`node --import tsx server/src/index.ts`), reads catalog data, kills the
 * process, respawns it against the same durable database, and asserts the
 * persisted catalog and session are unchanged. Loan-dependent domain records
 * remain dependency-gated (F-04/F-05).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import type { Pool } from "pg";
import { createPool } from "../src/db/pool";
import { createTestContext, loanRelationsExist, requireTestDbUrl, TestContext } from "./harness";

/** Gate: true once #11/#12 Request/Loan relations exist (see migrations.ts). */
const HAS_LOAN_RELATIONS = await (async () => {
  const probe = createPool(requireTestDbUrl());
  try {
    return await loanRelationsExist(probe);
  } finally {
    await probe.end();
  }
})();

const PORT = 3123;
const ORIGIN = `http://localhost:${PORT}`;
const ROOT = process.cwd();
const START_TIMEOUT_MS = 20_000;

let ctx: TestContext;
let pool: Pool;
let child: ChildProcess | undefined;
let cookieForRestart = "";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startAppProcess(): Promise<ChildProcess> {
  const testDb = requireTestDbUrl();
  const proc = spawn(process.execPath, ["--import", "tsx", "server/src/index.ts"], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      APP_ORIGIN: ORIGIN,
      DATABASE_URL: testDb,
      TEST_DATABASE_URL: testDb,
      SESSION_IDLE_MINUTES: "60",
      SESSION_ABSOLUTE_MINUTES: "480",
      SESSION_COOKIE_NAME: "pew_session",
      SESSION_COOKIE_SECURE: "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${ORIGIN}/login.html`);
      if (res.ok) return proc;
    } catch {
      /* not up yet */
    }
    await sleep(150);
  }
  proc.kill("SIGKILL");
  throw new Error("application process did not become ready in time");
}

async function stopAppProcess(proc: ChildProcess): Promise<void> {
  const exited = new Promise<void>((resolve) => proc.once("exit", () => resolve()));
  proc.kill("SIGKILL");
  await exited;
}

async function login(username: string, password: string): Promise<string> {
  const res = await fetch(`${ORIGIN}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
    body: JSON.stringify({ username, password }),
  });
  const setCookie = res.headers.get("set-cookie") ?? "";
  const m = setCookie.match(/pew_session=([^;]+)/);
  return m ? m[1] : "";
}

beforeAll(async () => {
  ctx = await createTestContext();
  pool = ctx.pool;
  // Self-healing: clear loan-dependent debris before fixture rows are touched
  // (borrowing_requests/loans reference users/equipment).
  if (HAS_LOAN_RELATIONS) {
    await pool.query(`DELETE FROM loans WHERE id = 'loan-f03-restart' OR request_id = 'req-f03-restart'`);
    await pool.query(`DELETE FROM borrowing_requests WHERE id = 'req-f03-restart'`);
  }
  // Isolated restart fixtures (unique ids avoid interference from other files).
  await pool.query(`DELETE FROM sessions WHERE user_id = 'u-restart-e2e'`);
  await pool.query(`DELETE FROM borrowing_requests WHERE borrower_id = 'u-restart-e2e'`);
  await pool.query(`DELETE FROM users WHERE id = 'u-restart-e2e' OR username = 'RESTART-E2E'`);
  const { hashPassword } = await import("../src/services/password");
  await pool.query(`INSERT INTO users (id, username, password_hash, role) VALUES ('u-restart-e2e', 'RESTART-E2E', $1, 'BORROWER')`, [
    await hashPassword("pw-restart"),
  ]);
  await pool.query(`DELETE FROM equipment WHERE id IN ('fixture-e-persist', 'fixture-e-persist-2')`);
  await pool.query(`INSERT INTO equipment (id, name, description, category, quantity_total) VALUES ('fixture-e-persist', 'Persisted restart fixture', 'Survives process restart', 'Synthetic', 2)`);
  await pool.query(`INSERT INTO equipment (id, name, description, category, quantity_total) VALUES ('fixture-e-persist-2', 'Persisted zero fixture', 'Survives process restart', 'Synthetic', 0)`);
}, 60_000);

afterAll(async () => {
  if (child) await stopAppProcess(child);
  if (HAS_LOAN_RELATIONS) {
    await pool.query(`DELETE FROM loans WHERE id = 'loan-f03-restart'`);
    await pool.query(`DELETE FROM borrowing_requests WHERE id = 'req-f03-restart'`);
  }
  await pool.query(`DELETE FROM sessions WHERE user_id = 'u-restart-e2e'`);
  await pool.query(`DELETE FROM borrowing_requests WHERE borrower_id = 'u-restart-e2e'`);
  await pool.query(`DELETE FROM users WHERE id = 'u-restart-e2e'`);
  await pool.query(`DELETE FROM equipment WHERE id IN ('fixture-e-persist', 'fixture-e-persist-2')`);
  await pool.end();
});

describe("Application process restart against the same durable DB (AC-06.2-03)", () => {
  it(
    "catalog and session survive a full process stop/start (TEST-F02-10 process-restart evidence)",
    async () => {
      // --- process #1 ---
      child = await startAppProcess();
      const cookie = await login("RESTART-E2E", "pw-restart");
      expect(cookie).toBeTruthy();
      const before = await fetch(`${ORIGIN}/api/equipment`, { headers: { Cookie: `pew_session=${cookie}` } });
      expect(before.status).toBe(200);
      const beforeBody = (await before.json()) as { data: Array<{ id: string; name: string; quantity_total: number }> };
      const snapshot = beforeBody.data
        .filter((i) => i.id.startsWith("fixture-e-persist"))
        .map((i) => ({ id: i.id, name: i.name, quantity_total: i.quantity_total }));
      expect(snapshot).toHaveLength(2);
      // TEST-F04-08: create through the real HTTP API, then stop/start the
      // actual application process without resetting or reseeding its DB.
      const createdRequest = await fetch(`${ORIGIN}/api/requests`, {
        method: "POST", headers: { Origin: ORIGIN, Cookie: `pew_session=${cookie}`, "Content-Type": "application/json" },
        body: JSON.stringify({ equipment_id: "fixture-e-persist", quantity_requested: 2 }),
      });
      expect(createdRequest.status).toBe(201);
      const persistedRequest = await createdRequest.json() as { data: { id: string } };

      // --- hard stop the application process ---
      await stopAppProcess(child);
      child = undefined;

      // --- process #2: same database, no reseed ---
      child = await startAppProcess();
      // The pre-restart session must still authenticate (durable revocation store).
      const after = await fetch(`${ORIGIN}/api/equipment`, { headers: { Cookie: `pew_session=${cookie}` } });
      expect(after.status).toBe(200);
      const afterBody = (await after.json()) as { data: Array<{ id: string; name: string; quantity_total: number }> };
      const afterSnapshot = afterBody.data
        .filter((i) => i.id.startsWith("fixture-e-persist"))
        .map((i) => ({ id: i.id, name: i.name, quantity_total: i.quantity_total }));
      expect(afterSnapshot).toEqual(snapshot);
      const requestAfterRestart = await fetch(`${ORIGIN}/api/requests/${encodeURIComponent(persistedRequest.data.id)}`, {
        headers: { Cookie: `pew_session=${cookie}` },
      });
      expect(requestAfterRestart.status).toBe(200);
      expect(await requestAfterRestart.json()).toEqual(persistedRequest);
      // no startup reseed: totals and names identical, no duplicate fixtures
      expect(afterBody.data.filter((i) => i.id === "fixture-e-persist")).toHaveLength(1);
    },
    90_000,
  );
});

/**
 * DEPENDENCY-GATED on the #11/#12 Request/Loan schema (team decision
 * 2026-11-06, Issue #10 audit — "MOVE Migration 002"): the fixture rows below
 * live in `borrowing_requests`/`loans`, which are created by #11/#12. The test
 * runs unchanged (skipIf) as soon as those relations exist.
 */
describe.skipIf(!HAS_LOAN_RELATIONS)("Derived availability survives process restart (TEST-F03-09 / AC-06.3-05)", () => {
  it(
    "keeps the same derived quantity/label after a hard restart on the same store",
    async () => {
      // Persisted active loan fixture (TEST-F03-02 recipe): fixture-e-persist
      // total 2, held 1 → 1/AVAILABLE. Availability is derived from persisted
      // loan rows at read time — restart must recompute the same result.
      await pool.query(`DELETE FROM loans WHERE id = 'loan-f03-restart'`);
      await pool.query(`DELETE FROM borrowing_requests WHERE id = 'req-f03-restart'`);
      await pool.query(
        `INSERT INTO borrowing_requests (id, borrower_id, equipment_id, quantity_requested, created_at)
         VALUES ('req-f03-restart', 'u-restart-e2e', 'fixture-e-persist', 1, now())`,
      );
      await pool.query(
        `INSERT INTO loans (id, request_id, quantity_borrowed, checked_out_by, checkout_at, due_on)
         VALUES ('loan-f03-restart', 'req-f03-restart', 1, 'u-restart-e2e', now(), current_date + 7)`,
      );

      const readAvailability = async () => {
        const res = await fetch(`${ORIGIN}/api/equipment/fixture-e-persist`, {
          headers: { Cookie: `pew_session=${cookieForRestart}` },
        });
        expect(res.status).toBe(200);
        return (await res.json()) as {
          data: { quantity_total: number; quantity_available: number; availability: string };
        };
      };

      // --- process #1 ---
      child = await startAppProcess();
      cookieForRestart = await login("RESTART-E2E", "pw-restart");
      expect(cookieForRestart).toBeTruthy();
      const before = await readAvailability();
      expect(before.data).toMatchObject({ quantity_total: 2, quantity_available: 1, availability: "AVAILABLE" });

      // --- hard stop, then process #2 on the same durable store ---
      await stopAppProcess(child);
      child = undefined;
      child = await startAppProcess();

      const after = await readAvailability();
      expect(after.data).toMatchObject({ quantity_total: 2, quantity_available: 1, availability: "AVAILABLE" });
    },
    90_000,
  );
});
