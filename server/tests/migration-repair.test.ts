import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../src/db/migrations";

const databaseUrl = process.env.MIGRATION_TEST_DATABASE_URL;

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
});
