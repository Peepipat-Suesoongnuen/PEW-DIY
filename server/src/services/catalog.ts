/**
 * Equipment Catalog service (F-02) + Availability derivation (F-03, Issue #10)
 * — contracts `f-02-equipment-catalog.md`, `f-03-equipment-availability.md`.
 *
 * Validation is enforced at the typed seed/data boundary before storage
 * (AC-F02-05). The schema constraints (`quantity_total >= 0`,
 * `quantity_borrowed > 0`, `quantity_requested > 0`) are the second line of
 * defense. `quantity_available` is DERIVED at read time from persisted stock
 * and held units (f-03 §2/§4): held = sum of `quantity_borrowed` over the
 * item's ACTIVE loans (loans with `returned_at IS NULL`, D1-03 §3.3), reached
 * through Equipment→Request→Loan linkage. No availability counter is stored.
 *
 * Schema-ownership note (team decision 2026-11-06, Issue #10 audit —
 * "MOVE Migration 002"): the Request/Loan relations are created by #11/#12
 * (see the handover note in db/migrations.ts). This service probes for those
 * relations at read time (PostgreSQL `to_regclass`; SDS-OQ-01 resolved:
 * PostgreSQL 17): while they are absent, held is definitionally zero — "with
 * no loans possible yet" — and both read variants are single statements, so a
 * read never mixes a new total with stale held units (f-03 §4).
 *
 * SRS OQ-01 (real demo catalog) remains OPEN: fixtures seeded here are
 * synthetic test/demo content, not the approved real catalog.
 */
import type { Pool, PoolClient } from "pg";

export interface EquipmentInput {
  id: string;
  name: string;
  description: string;
  category: string;
  quantityTotal: number;
}

export interface EquipmentView {
  id: string;
  name: string;
  description: string;
  category: string;
  quantity_total: number;
  quantity_available: number;
  availability: "AVAILABLE" | "UNAVAILABLE";
}

/**
 * Typed boundary validation (AC-F02-05): required nonempty name/category
 * (description may be empty per shared convention), total quantity must be a
 * non-negative integer — fractional values are rejected, never silently
 * rounded. Schema CHECK constraints back this up at the database.
 */
export function validateEquipmentInput(input: EquipmentInput): EquipmentInput {
  const { id, name, description, category, quantityTotal } = input;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("VALIDATION: id must be a nonempty string");
  }
  if (typeof name !== "string" || name.length === 0) {
    throw new Error("VALIDATION: name must be a nonempty string");
  }
  if (typeof description !== "string") {
    throw new Error("VALIDATION: description must be a string (may be empty)");
  }
  if (typeof category !== "string" || category.length === 0) {
    throw new Error("VALIDATION: category must be a nonempty string");
  }
  if (typeof quantityTotal !== "number" || !Number.isInteger(quantityTotal) || quantityTotal < 0) {
    throw new Error("VALIDATION: quantityTotal must be a non-negative integer");
  }
  return { id, name, description, category, quantityTotal };
}

/**
 * Invalid persisted aggregate state (f-03 §2 boundary handling): negative or
 * non-integer totals/held contributions, or held > total, are corrupt data —
 * never normal stock levels. Reads surface this as a safe 500 with a redacted
 * diagnostic and NEVER clamp with `max(0, …)` (TEST-F03-05/06).
 */
export class AvailabilityIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AvailabilityIntegrityError";
  }
}

/**
 * Derived availability (f-03 §2, SRS BR-03):
 *   held(item)               = sum(quantity_borrowed of active loans)
 *   quantity_available(item) = quantity_total - held
 *   availability             = AVAILABLE if quantity_available >= 1 else UNAVAILABLE
 * Invalid inputs raise `AvailabilityIntegrityError` explicitly — no clamping,
 * no silent zero, no mutation of inputs (TEST-F03-01/05).
 */
export function deriveAvailability(total: number, held: number): { available: number; availability: "AVAILABLE" | "UNAVAILABLE" } {
  if (!Number.isInteger(total) || total < 0) {
    throw new AvailabilityIntegrityError("invalid total quantity");
  }
  if (!Number.isInteger(held) || held < 0) {
    throw new AvailabilityIntegrityError("invalid held quantity");
  }
  if (held > total) {
    throw new AvailabilityIntegrityError("held exceeds total");
  }
  const available = total - held;
  return { available, availability: available >= 1 ? "AVAILABLE" : "UNAVAILABLE" };
}

/**
 * PostgreSQL schema probe (`to_regclass`) — engine-specific by design and
 * documented per f-03 §4 (SDS-OQ-01 resolved: PostgreSQL 17). Detects whether
 * the #11/#12-owned Request/Loan relations exist yet.
 */
async function loanRelationsAvailable(pool: Pick<Pool, "query">): Promise<boolean> {
  const res = await pool.query(
    `SELECT to_regclass('loans') AS loans, to_regclass('borrowing_requests') AS requests`,
  );
  const row = res.rows[0] as { loans: unknown; requests: unknown };
  return row.loans !== null && row.requests !== null;
}

/**
 * Aggregate read variants (f-03 §4: "F-03 adds the aggregate read/query …
 * with Equipment→Request→Loan linkage"). Both are SINGLE statements so total
 * and held come from one snapshot.
 */
const AGGREGATE_COLUMNS = `
  e.id, e.name, e.description, e.category, e.quantity_total`;
// Real aggregate: held = sum of active loans reached via the request linkage.
const AGGREGATE_WITH_LINKAGE_SQL = `
  SELECT${AGGREGATE_COLUMNS},
  COALESCE(SUM(l.quantity_borrowed) FILTER (WHERE l.returned_at IS NULL), 0)::int AS held
  FROM equipment e
  LEFT JOIN borrowing_requests r ON r.equipment_id = e.id
  LEFT JOIN loans l ON l.request_id = r.id`;
// Pre-#11/#12 boundary: no loan relations exist, held is definitionally zero.
const AGGREGATE_WITHOUT_RELATIONS_SQL = `
  SELECT${AGGREGATE_COLUMNS}, 0::int AS held
  FROM equipment e`;

interface StockRow {
  id: string;
  name: string;
  description: string;
  category: string;
  quantity_total: number | string;
  held: number | string;
}

function toView(row: StockRow): EquipmentView {
  const total = Number(row.quantity_total);
  const held = Number(row.held);
  const { available, availability } = deriveAvailability(total, held);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    quantity_total: total,
    quantity_available: available,
    availability,
  };
}

/**
 * Non-destructive fixture seed (AC-F02-04, TEST-F02-05): inserts when absent,
 * never overwrites existing totals and never touches users/requests/loans.
 */
export async function seedEquipmentFixture(
  pool: Pick<Pool, "query"> | PoolClient,
  input: EquipmentInput,
): Promise<"inserted" | "skipped"> {
  const v = validateEquipmentInput(input);
  const existing = await pool.query(`SELECT id FROM equipment WHERE id = $1`, [v.id]);
  if ((existing.rowCount ?? 0) > 0) return "skipped";
  await pool.query(
    `INSERT INTO equipment (id, name, description, category, quantity_total) VALUES ($1, $2, $3, $4, $5)`,
    [v.id, v.name, v.description, v.category, v.quantityTotal],
  );
  return "inserted";
}

export async function listEquipment(pool: Pick<Pool, "query">): Promise<EquipmentView[]> {
  const linked = await loanRelationsAvailable(pool);
  const sql = linked ? AGGREGATE_WITH_LINKAGE_SQL : AGGREGATE_WITHOUT_RELATIONS_SQL;
  const res = await pool.query(`${sql}\n  GROUP BY e.id ORDER BY e.id`);
  return res.rows.map((row) => toView(row as StockRow));
}

export async function getEquipment(pool: Pick<Pool, "query">, id: string): Promise<EquipmentView | null> {
  const linked = await loanRelationsAvailable(pool);
  const sql = linked ? AGGREGATE_WITH_LINKAGE_SQL : AGGREGATE_WITHOUT_RELATIONS_SQL;
  const res = await pool.query(`${sql}\n  WHERE e.id = $1 GROUP BY e.id`, [id]);
  const row = res.rows[0];
  return row ? toView(row as StockRow) : null;
}
