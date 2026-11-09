/**
 * Integration test harness — real PostgreSQL database, real migrations.
 * TEST-F01-05/06 route-parameterized inventory: the registry below lists
 * every protected route so coverage expands automatically as F-02..F-05 add
 * routes (contract §2.2). No in-process fallbacks; fail-closed by design.
 */
import { Pool } from "pg";
import { migrate } from "../src/db/migrations";
import { createPool } from "../src/db/pool";
import { loadConfig } from "../src/config/config";

export interface TestContext {
  pool: Pool;
  testDatabaseUrl: string;
}

/**
 * Protected route inventory for parameterized auth tests. When a feature adds
 * a protected route, it MUST be registered here so TEST-F01-05/06/09 cover it
 * (contract: "Expand the route-parameterized tests whenever a protected route
 * is added").
 */
export const PROTECTED_ROUTE_INVENTORY: ReadonlyArray<{
  method: string;
  path: string;
  sampleBody?: Record<string, unknown>;
}> = [
  { method: "GET", path: "/api/auth/me" },
  { method: "POST", path: "/api/requests/fixture-r-one/checkout", sampleBody: {} },
  { method: "GET", path: "/api/loans" },
  { method: "GET", path: "/api/loans/fixture-loan" },
  { method: "POST", path: "/api/auth/logout", sampleBody: {} },
  // F-02 catalog routes (registered so TEST-F01-05/06/09 expand automatically).
  { method: "GET", path: "/api/equipment" },
  { method: "GET", path: "/api/equipment/fixture-e-one" },
  { method: "POST", path: "/api/requests", sampleBody: { equipment_id: "fixture-e-one", quantity_requested: 1 } },
  { method: "GET", path: "/api/requests" },
  { method: "GET", path: "/api/requests/fixture-r-one" },
];

export function requireTestDbUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL is required for integration tests (fail-closed)");
  }
  return url;
}

export async function createTestContext(): Promise<TestContext> {
  const testDatabaseUrl = requireTestDbUrl();
  const pool = createPool(testDatabaseUrl);
  await migrate(pool);
  return { pool, testDatabaseUrl };
}

export async function resetTestDb(pool: Pool): Promise<void> {
  if (await loanRelationsExist(pool)) await pool.query("DELETE FROM loans");
  await pool.query("DELETE FROM borrowing_requests");
  // Order matters: sessions reference users.
  await pool.query("DELETE FROM sessions");
  await pool.query("DELETE FROM users");
}

/**
 * True when the Request/Loan relations owned by #11/#12 exist (see the
 * handover note in src/db/migrations.ts). Used to dependency-gate the real-DB
 * loan-dependent tests until those migrations land (team decision 2026-11-06,
 * Issue #10 audit: "MOVE Migration 002").
 */
export async function loanRelationsExist(db: Pick<Pool, "query">): Promise<boolean> {
  const res = await db.query(
    `SELECT to_regclass('loans') AS loans, to_regclass('borrowing_requests') AS requests`,
  );
  const row = res.rows[0] as { loans: unknown; requests: unknown };
  return row.loans !== null && row.requests !== null;
}

export function configForTests(): ReturnType<typeof loadConfig> {
  return loadConfig({
    ...process.env,
    SESSION_IDLE_MINUTES: process.env.TEST_SESSION_IDLE_MINUTES ?? "60",
    SESSION_ABSOLUTE_MINUTES: process.env.TEST_SESSION_ABSOLUTE_MINUTES ?? "480",
  });
}
