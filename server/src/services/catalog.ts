/**
 * Equipment Catalog service (F-02, F-08) + Availability derivation (F-03)
 * — contracts `f-02-equipment-catalog.md`, `f-03-equipment-availability.md`,
 * `f-08-catalog-search-loans.md`.
 */
import { randomUUID } from "crypto";
import type { Pool, PoolClient } from "pg";

export type CatalogStatus = "ACTIVE" | "RETIRED";
export type CatalogSort = "name_asc" | "name_desc" | "available_desc" | "available_asc";

export const MAX_EQUIPMENT_NAME_LENGTH = 120;
export const MAX_EQUIPMENT_CATEGORY_LENGTH = 60;
export const MAX_EQUIPMENT_DESCRIPTION_LENGTH = 1000;

export interface EquipmentInput {
  id: string;
  name: string;
  description: string;
  category: string;
  quantityTotal: number;
  imageUrl?: string;
  catalogStatus?: CatalogStatus;
}

export interface EquipmentFilter {
  q?: string;
  category?: string;
  availability?: "AVAILABLE" | "UNAVAILABLE";
  status?: CatalogStatus | "ALL";
  sort?: CatalogSort;
}

export interface EquipmentView {
  id: string;
  name: string;
  description: string;
  category: string;
  quantity_total: number;
  quantity_available: number;
  availability: "AVAILABLE" | "UNAVAILABLE";
  image_url: string;
  catalog_status: CatalogStatus;
}

export class CatalogError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly safeMessage: string,
  ) {
    super(code);
    this.name = "CatalogError";
  }
}

export function validateImageUrl(url: unknown): string {
  if (url === undefined || url === null) return "";
  if (typeof url !== "string" || url.includes("\0")) {
    throw new CatalogError(400, "VALIDATION_ERROR", "Invalid image_url.");
  }
  const trimmed = url.trim();
  if (trimmed === "") return "";
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return trimmed;
    }
  } catch {
    // fall through to rejection
  }
  throw new CatalogError(400, "VALIDATION_ERROR", "image_url must be an http(s) URL or relative path.");
}

export function validateEquipmentInput(input: EquipmentInput): EquipmentInput {
  const { id, name, description, category, quantityTotal, imageUrl, catalogStatus } = input;
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
  const safeImage = validateImageUrl(imageUrl);
  const status: CatalogStatus = catalogStatus ?? "ACTIVE";
  if (status !== "ACTIVE" && status !== "RETIRED") {
    throw new Error("VALIDATION: invalid catalogStatus");
  }
  return { id, name, description, category, quantityTotal, imageUrl: safeImage, catalogStatus: status };
}

export class AvailabilityIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AvailabilityIntegrityError";
  }
}

export function deriveAvailability(
  total: number,
  held: number,
): { available: number; availability: "AVAILABLE" | "UNAVAILABLE" } {
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

/** BR-06 / F-08 invariant: cannot reduce total below currently held units. */
export function assertTotalNotBelowHeld(newTotal: number, held: number): void {
  if (!Number.isSafeInteger(newTotal) || newTotal < 0) {
    throw new CatalogError(400, "VALIDATION_ERROR", "quantity_total must be a non-negative integer.");
  }
  if (newTotal < held) {
    throw new CatalogError(
      409,
      "HELD_QUANTITY_CONFLICT",
      `Cannot reduce total quantity (${newTotal}) below currently held units (${held}).`,
    );
  }
}

async function loanRelationsAvailable(pool: Pick<Pool, "query">): Promise<boolean> {
  const res = await pool.query(
    `SELECT to_regclass('loans') AS loans, to_regclass('borrowing_requests') AS requests`,
  );
  const row = res.rows[0] as { loans: unknown; requests: unknown };
  return row.loans !== null && row.requests !== null;
}

async function equipmentHasS2Columns(pool: Pick<Pool, "query">): Promise<boolean> {
  const res = await pool.query(
    `SELECT count(*)::int AS cnt FROM information_schema.columns
     WHERE table_schema = current_schema() AND table_name = 'equipment' AND column_name IN ('image_url', 'catalog_status')`,
  );
  return Number(res.rows[0]?.cnt ?? 0) === 2;
}

interface StockRow {
  id: string;
  name: string;
  description: string;
  category: string;
  quantity_total: number | string;
  held: number | string;
  image_url?: string;
  catalog_status?: CatalogStatus;
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
    image_url: row.image_url ?? "",
    catalog_status: row.catalog_status ?? "ACTIVE",
  };
}

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

export async function listEquipment(
  pool: Pick<Pool, "query">,
  filter: EquipmentFilter = {},
): Promise<EquipmentView[]> {
  const linked = await loanRelationsAvailable(pool);
  const hasS2 = await equipmentHasS2Columns(pool);
  const cols = hasS2
    ? `e.id, e.name, e.description, e.category, e.quantity_total, e.image_url, e.catalog_status`
    : `e.id, e.name, e.description, e.category, e.quantity_total, ''::text AS image_url, 'ACTIVE'::text AS catalog_status`;

  const sql = linked
    ? `SELECT ${cols}, COALESCE(SUM(l.quantity_borrowed) FILTER (WHERE l.returned_at IS NULL), 0)::int AS held
       FROM equipment e
       LEFT JOIN borrowing_requests r ON r.equipment_id = e.id
       LEFT JOIN loans l ON l.request_id = r.id`
    : `SELECT ${cols}, 0::int AS held FROM equipment e`;

  const res = await pool.query(`${sql}\n GROUP BY e.id ORDER BY e.id`);
  let items = res.rows.map((row) => toView(row as StockRow));

  if (filter.status && filter.status !== "ALL") {
    items = items.filter((item) => item.catalog_status === filter.status);
  }
  if (filter.q && filter.q.trim().length > 0) {
    const q = filter.q.trim().toLowerCase();
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
    );
  }
  if (filter.category && filter.category.trim().length > 0) {
    const cat = filter.category.trim().toLowerCase();
    items = items.filter((item) => item.category.toLowerCase() === cat);
  }
  if (filter.availability === "AVAILABLE" || filter.availability === "UNAVAILABLE") {
    items = items.filter((item) => item.availability === filter.availability);
  }
  const sort: CatalogSort = filter.sort ?? "name_asc";
  if (sort === "name_asc") {
    items.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  } else if (sort === "name_desc") {
    items.sort((a, b) => b.name.localeCompare(a.name) || a.id.localeCompare(b.id));
  } else if (sort === "available_desc") {
    items.sort((a, b) => b.quantity_available - a.quantity_available || a.name.localeCompare(b.name));
  } else if (sort === "available_asc") {
    items.sort((a, b) => a.quantity_available - b.quantity_available || a.name.localeCompare(b.name));
  }

  return items;
}

export async function getEquipment(pool: Pick<Pool, "query">, id: string): Promise<EquipmentView | null> {
  const linked = await loanRelationsAvailable(pool);
  const hasS2 = await equipmentHasS2Columns(pool);
  const cols = hasS2
    ? `e.id, e.name, e.description, e.category, e.quantity_total, e.image_url, e.catalog_status`
    : `e.id, e.name, e.description, e.category, e.quantity_total, ''::text AS image_url, 'ACTIVE'::text AS catalog_status`;

  const sql = linked
    ? `SELECT ${cols}, COALESCE(SUM(l.quantity_borrowed) FILTER (WHERE l.returned_at IS NULL), 0)::int AS held
       FROM equipment e
       LEFT JOIN borrowing_requests r ON r.equipment_id = e.id
       LEFT JOIN loans l ON l.request_id = r.id`
    : `SELECT ${cols}, 0::int AS held FROM equipment e`;

  const res = await pool.query(`${sql}\n WHERE e.id = $1 GROUP BY e.id`, [id]);
  const row = res.rows[0];
  return row ? toView(row as StockRow) : null;
}

function parseBoundedText(value: unknown, field: string, maxLength: number, required: boolean): string {
  if (typeof value !== "string" || value.includes("\0")) {
    throw new CatalogError(400, "VALIDATION_ERROR", `Invalid ${field}.`);
  }
  const trimmed = value.trim();
  if (required && trimmed.length === 0) {
    throw new CatalogError(400, "VALIDATION_ERROR", `${field} is required.`);
  }
  if (trimmed.length > maxLength) {
    throw new CatalogError(400, "VALIDATION_ERROR", `${field} must be at most ${maxLength} characters.`);
  }
  return trimmed;
}

export function validateCreateEquipmentBody(input: unknown): {
  name: string;
  description: string;
  category: string;
  quantity_total: number;
  image_url: string;
} {
  const invalid = (msg = "Invalid equipment payload.") => new CatalogError(400, "VALIDATION_ERROR", msg);
  if (!input || typeof input !== "object" || Array.isArray(input)) throw invalid();
  const body = input as Record<string, unknown>;
  const allowed = new Set(["name", "description", "category", "quantity_total", "image_url"]);
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) throw invalid();
  }
  const name = parseBoundedText(body.name, "name", MAX_EQUIPMENT_NAME_LENGTH, true);
  const rawDescription = body.description === undefined ? "" : body.description;
  const description = parseBoundedText(rawDescription, "description", MAX_EQUIPMENT_DESCRIPTION_LENGTH, false);
  const category = parseBoundedText(body.category, "category", MAX_EQUIPMENT_CATEGORY_LENGTH, true);
  if (
    typeof body.quantity_total !== "number" ||
    !Number.isSafeInteger(body.quantity_total) ||
    body.quantity_total < 0 ||
    body.quantity_total > 2_147_483_647
  ) {
    throw invalid();
  }
  const image_url = validateImageUrl(body.image_url);
  return {
    name,
    description,
    category,
    quantity_total: body.quantity_total,
    image_url,
  };
}

export async function createEquipment(pool: Pool, input: unknown): Promise<EquipmentView> {
  const data = validateCreateEquipmentBody(input);
  const id = `eq-${randomUUID()}`;
  await pool.query(
    `INSERT INTO equipment (id, name, description, category, quantity_total, image_url, catalog_status)
     VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')`,
    [id, data.name, data.description, data.category, data.quantity_total, data.image_url],
  );
  const created = await getEquipment(pool, id);
  return created!;
}

export function validateUpdateEquipmentBody(input: unknown): {
  name?: string;
  description?: string;
  category?: string;
  quantity_total?: number;
  image_url?: string;
  catalog_status?: CatalogStatus;
} {
  const invalid = (msg = "Invalid equipment update payload.") => new CatalogError(400, "VALIDATION_ERROR", msg);
  if (!input || typeof input !== "object" || Array.isArray(input)) throw invalid();
  const body = input as Record<string, unknown>;
  const allowed = new Set(["name", "description", "category", "quantity_total", "image_url", "catalog_status"]);
  const keys = Object.keys(body);
  if (keys.length === 0) throw invalid();
  for (const key of keys) {
    if (!allowed.has(key)) throw invalid();
  }
  const patch: ReturnType<typeof validateUpdateEquipmentBody> = {};
  if (Object.hasOwn(body, "name")) {
    patch.name = parseBoundedText(body.name, "name", MAX_EQUIPMENT_NAME_LENGTH, true);
  }
  if (Object.hasOwn(body, "description")) {
    patch.description = parseBoundedText(body.description, "description", MAX_EQUIPMENT_DESCRIPTION_LENGTH, false);
  }
  if (Object.hasOwn(body, "category")) {
    patch.category = parseBoundedText(body.category, "category", MAX_EQUIPMENT_CATEGORY_LENGTH, true);
  }
  if (Object.hasOwn(body, "quantity_total")) {
    if (
      typeof body.quantity_total !== "number" ||
      !Number.isSafeInteger(body.quantity_total) ||
      body.quantity_total < 0 ||
      body.quantity_total > 2_147_483_647
    ) {
      throw invalid();
    }
    patch.quantity_total = body.quantity_total;
  }
  if (Object.hasOwn(body, "image_url")) {
    patch.image_url = validateImageUrl(body.image_url);
  }
  if (Object.hasOwn(body, "catalog_status")) {
    if (body.catalog_status !== "ACTIVE" && body.catalog_status !== "RETIRED") throw invalid();
    patch.catalog_status = body.catalog_status;
  }
  return patch;
}

export async function updateEquipment(pool: Pool, id: string, input: unknown): Promise<EquipmentView> {
  if (!id || id.includes("\0")) throw new CatalogError(400, "VALIDATION_ERROR", "Invalid equipment id.");
  const patch = validateUpdateEquipmentBody(input);
  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    const locked = await client.query(
      `SELECT id, name, description, category, quantity_total, image_url, catalog_status FROM equipment WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (!locked.rowCount) throw new CatalogError(404, "NOT_FOUND", "Resource not found.");
    const current = locked.rows[0] as {
      id: string;
      name: string;
      description: string;
      category: string;
      quantity_total: number;
      image_url: string;
      catalog_status: CatalogStatus;
    };
    const heldRes = await client.query(
      `SELECT COALESCE(SUM(l.quantity_borrowed) FILTER (WHERE l.returned_at IS NULL), 0)::int AS held
       FROM borrowing_requests r LEFT JOIN loans l ON l.request_id = r.id WHERE r.equipment_id = $1`,
      [id],
    );
    const held = Number(heldRes.rows[0]?.held ?? 0);
    const nextTotal = patch.quantity_total ?? Number(current.quantity_total);
    assertTotalNotBelowHeld(nextTotal, held);

    await client.query(
      `UPDATE equipment
       SET name = $2, description = $3, category = $4, quantity_total = $5, image_url = $6, catalog_status = $7
       WHERE id = $1`,
      [
        id,
        patch.name ?? current.name,
        patch.description ?? current.description,
        patch.category ?? current.category,
        nextTotal,
        patch.image_url ?? current.image_url,
        patch.catalog_status ?? current.catalog_status,
      ],
    );
    const updated = await getEquipment(client as unknown as Pool, id);
    await client.query("COMMIT");
    return updated!;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
