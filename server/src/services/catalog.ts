/**
 * Equipment Catalog service (F-02) — contract `f-02-equipment-catalog.md`.
 *
 * Validation is enforced at the typed seed/data boundary before storage
 * (AC-F02-05). The schema constraint (`quantity_total >= 0`) is the second
 * line of defense. `quantity_available` is derived per the availability rule;
 * F-03 owns the long-term formula and F-05 will supply held-quantity input —
 * with no loans possible yet, held is zero (documented boundary).
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
 * Derived availability (F-02 initial form): held units come from active loans
 * which do not exist until F-05; F-03 owns/refines the formula.
 */
export function deriveAvailability(total: number, held: number): { available: number; availability: "AVAILABLE" | "UNAVAILABLE" } {
  const available = total - held;
  return { available, availability: available >= 1 ? "AVAILABLE" : "UNAVAILABLE" };
}

function toView(row: { id: string; name: string; description: string; category: string; quantity_total: number | string }): EquipmentView {
  const total = Number(row.quantity_total);
  const { available, availability } = deriveAvailability(total, 0);
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
  const res = await pool.query(
    `SELECT id, name, description, category, quantity_total FROM equipment ORDER BY id`,
  );
  return res.rows.map(toView);
}

export async function getEquipment(pool: Pick<Pool, "query">, id: string): Promise<EquipmentView | null> {
  const res = await pool.query(
    `SELECT id, name, description, category, quantity_total FROM equipment WHERE id = $1`,
    [id],
  );
  const row = res.rows[0];
  return row ? toView(row) : null;
}
