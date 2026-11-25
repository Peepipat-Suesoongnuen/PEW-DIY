import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../src/db/migrations";

const databaseUrl = process.env.MIGRATION_TEST_DATABASE_URL;

if (process.env.CI === "true") {
  if (!databaseUrl) {
    throw new Error("MIGRATION_TEST_DATABASE_URL is required in CI; the migration-repair test must not be skipped");
  }

  const migrationDatabaseName = decodeURIComponent(new URL(databaseUrl).pathname.slice(1));
  const sharedCiDatabaseName = process.env.CI_TEST_DATABASE_URL
    ? decodeURIComponent(new URL(process.env.CI_TEST_DATABASE_URL).pathname.slice(1))
    : undefined;
  if (
    migrationDatabaseName !== "pewdiy_migration_repair_test" ||
    migrationDatabaseName === sharedCiDatabaseName
  ) {
    throw new Error("CI migration-repair tests require a separate pewdiy_migration_repair_test database");
  }
}

describe.skipIf(!databaseUrl)("database migration repair", () => {
  const pool = new Pool({ connectionString: databaseUrl });

  beforeAll(async () => {
    const result = await pool.query<{ database_name: string }>(
      "SELECT current_database() AS database_name",
    );
    if (result.rows[0]?.database_name !== "pewdiy_migration_repair_test") {
      throw new Error("MIGRATION_TEST_DATABASE_URL must target the dedicated disposable database");
    }

    // This test owns this explicitly named disposable database only.
    await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    await migrate(pool);
    await pool.query(
      `INSERT INTO users(id, username, password_hash, role)
       VALUES ('repair-borrower', 'repair-borrower', 'hash', 'BORROWER'),
              ('repair-custodian', 'repair-custodian', 'hash', 'CUSTODIAN')`,
    );
    await pool.query(
      "INSERT INTO equipment(id, name, description, category, quantity_total) VALUES ('repair-equipment', 'Board', '', 'Electronics', 1)",
    );
    await pool.query(
      `INSERT INTO borrowing_requests(id, borrower_id, equipment_id, quantity_requested)
       VALUES ('repair-request', 'repair-borrower', 'repair-equipment', 1)`,
    );
    await pool.query(
      `INSERT INTO loans(id, request_id, quantity_borrowed, checked_out_by, checkout_at, due_on)
       VALUES ('repair-loan', 'repair-request', 1, 'repair-custodian', now(), current_date + 7)`,
    );

    // Simulate a pre-existing table created without its request foreign key.
    await pool.query("ALTER TABLE loans DROP CONSTRAINT loans_request_id_fkey");
    await pool.query(
      `INSERT INTO loans(id, request_id, quantity_borrowed, checked_out_by, checkout_at, due_on)
       VALUES ('orphan-loan', 'missing-request', 1, 'repair-custodian', now(), current_date + 7)`,
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  it("refuses orphan rows without deleting data, then repairs the missing request foreign key", async () => {
    await expect(migrate(pool)).rejects.toMatchObject({ code: "23503" });

    const orphanBeforeRepair = await pool.query(
      "SELECT id FROM loans WHERE id = 'orphan-loan'",
    );
    expect(orphanBeforeRepair.rowCount).toBe(1);

    await pool.query("DELETE FROM loans WHERE id = 'orphan-loan'");
    await migrate(pool);

    const foreignKey = await pool.query<{ constraint_count: string }>(
      `SELECT count(*)::text AS constraint_count
       FROM pg_constraint fk
       WHERE fk.contype = 'f'
         AND fk.conrelid = 'loans'::regclass
         AND fk.confrelid = 'borrowing_requests'::regclass
         AND fk.conkey = ARRAY[(
           SELECT attnum FROM pg_attribute
           WHERE attrelid = 'loans'::regclass AND attname = 'request_id' AND NOT attisdropped
         )]::smallint[]
         AND fk.confkey = ARRAY[(
           SELECT attnum FROM pg_attribute
           WHERE attrelid = 'borrowing_requests'::regclass AND attname = 'id' AND NOT attisdropped
         )]::smallint[]`,
    );
    expect(foreignKey.rows[0]?.constraint_count).toBe("1");

    const preservedLoan = await pool.query(
      "SELECT id FROM loans WHERE id = 'repair-loan' AND request_id = 'repair-request'",
    );
    expect(preservedLoan.rowCount).toBe(1);

    await expect(
      pool.query(
        `INSERT INTO loans(id, request_id, quantity_borrowed, checked_out_by, checkout_at, due_on)
         VALUES ('rejected-orphan', 'still-missing', 1, 'repair-custodian', now(), current_date + 7)`,
      ),
    ).rejects.toMatchObject({ code: "23503" });

    // Re-running the migration must not add a duplicate constraint.
    await migrate(pool);
    const afterRepeat = await pool.query<{ constraint_count: string }>(
      `SELECT count(*)::text AS constraint_count
       FROM pg_constraint
       WHERE contype = 'f' AND conrelid = 'loans'::regclass
         AND confrelid = 'borrowing_requests'::regclass`,
    );
    expect(afterRepeat.rows[0]?.constraint_count).toBe("1");
  });

  it("backfills expires_at for pre-existing unfulfilled PENDING (7d) and APPROVED (3d) requests idempotently", async () => {
    await pool.query(
      `INSERT INTO borrowing_requests (id, borrower_id, equipment_id, quantity_requested, approval_status, created_at, reviewed_at, expires_at)
       VALUES
         ('legacy-pending', 'repair-borrower', 'repair-equipment', 1, 'PENDING', '2026-11-01T10:00:00Z', NULL, NULL),
         ('legacy-approved', 'repair-borrower', 'repair-equipment', 1, 'APPROVED', '2026-11-01T10:00:00Z', '2026-11-02T12:00:00Z', NULL),
         ('legacy-rejected', 'repair-borrower', 'repair-equipment', 1, 'REJECTED', '2026-11-01T10:00:00Z', '2026-11-02T12:00:00Z', NULL)`,
    );

    await migrate(pool);

    const rows = await pool.query<{ id: string; expires_at: Date | null }>(
      `SELECT id, expires_at FROM borrowing_requests WHERE id IN ('legacy-pending', 'legacy-approved', 'legacy-rejected', 'repair-request')`,
    );
    const byId = new Map(rows.rows.map((r) => [r.id, r.expires_at?.toISOString() ?? null]));
    expect(byId.get("legacy-pending")).toBe("2026-11-08T10:00:00.000Z");
    expect(byId.get("legacy-approved")).toBe("2026-11-05T12:00:00.000Z");
    expect(byId.get("legacy-rejected")).toBeNull();
    expect(byId.get("repair-request")).toBeNull();

    // Re-running migration preserves backfilled values without altering timestamps.
    await migrate(pool);
    const rerun = await pool.query<{ id: string; expires_at: Date | null }>(
      `SELECT id, expires_at FROM borrowing_requests WHERE id IN ('legacy-pending', 'legacy-approved')`,
    );
    const rerunById = new Map(rerun.rows.map((r) => [r.id, r.expires_at?.toISOString() ?? null]));
    expect(rerunById.get("legacy-pending")).toBe("2026-11-08T10:00:00.000Z");
    expect(rerunById.get("legacy-approved")).toBe("2026-11-05T12:00:00.000Z");
  });
});
