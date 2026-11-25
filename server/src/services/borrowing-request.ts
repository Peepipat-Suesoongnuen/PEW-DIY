import { randomUUID } from "crypto";
import type { Pool, PoolClient } from "pg";
import { getEquipment } from "./catalog";
import type { SessionUser } from "./session";

export class RequestError extends Error {
  constructor(public readonly status: number, public readonly code: string, public readonly safeMessage: string) {
    super(code);
  }
}

export const PURPOSE_CATEGORIES = [
  "COURSE_PROJECT",
  "CAPSTONE",
  "LAB_RESEARCH",
  "PERSONAL_CLUB",
  "OTHER",
] as const;
export type PurposeCategory = (typeof PURPOSE_CATEGORIES)[number];

export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "CHECKED_OUT" | "EXPIRED";

export const MAX_PURPOSE_DETAIL_LENGTH = 1000;
export const MAX_BUNDLE_ITEMS = 10;
export const MAX_ACTIVE_PENDING_REQUESTS = 5;
export const PENDING_EXPIRY_DAYS = 7;
export const APPROVED_EXPIRY_DAYS = 3;

function addDays(instant: Date, days: number): Date {
  return new Date(instant.getTime() + days * 86_400_000);
}

export function isRequestExpired(expiresAt: unknown, now: Date): boolean {
  if (expiresAt === null || expiresAt === undefined) return false;
  return now.getTime() >= new Date(expiresAt as Date).getTime();
}

function isRowExpired(row: Record<string, unknown>, now: Date): boolean {
  if (row.fulfilled) return false;
  const ap = String(row.approval_status ?? "PENDING");
  if (ap !== "PENDING" && ap !== "APPROVED") return false;
  return isRequestExpired(row.expires_at, now);
}

function shortRef(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toLowerCase();
}

/** BR-01; BR-12: check current stock without reserving it. */
export function assertRequestAvailable(available: number): void {
  if (available < 1) {
    throw new RequestError(409, "INSUFFICIENT_AVAILABILITY", "Equipment is no longer available.");
  }
}

export function validateRequestedDays(days: unknown): number {
  if (days === undefined) return 7;
  if (typeof days !== "number" || !Number.isSafeInteger(days) || days < 1 || days > 14) {
    throw new RequestError(400, "VALIDATION_ERROR", "requested_days must be an integer between 1 and 14.");
  }
  return days;
}

export interface BorrowingRequestView {
  id: string;
  bundle_id: string | null;
  borrower_id: string;
  borrower_username?: string;
  equipment_id: string;
  equipment_name?: string;
  quantity_requested: number;
  purpose_category: PurposeCategory;
  purpose_detail: string;
  requested_days: number;
  approval_status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  decision_note: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  expires_at: string | null;
  created_at: string;
  status: RequestStatus;
}

export interface SingleRequestInput {
  equipment_id: string;
  quantity_requested: number;
  purpose_category: PurposeCategory;
  purpose_detail: string;
  requested_days: number;
}

export interface BundleRequestInput {
  items: Array<{ equipment_id: string; quantity_requested: number }>;
  purpose_category: PurposeCategory;
  purpose_detail: string;
  requested_days: number;
}

function parsePurposeCategory(val: unknown): PurposeCategory {
  if (val === undefined) return "OTHER";
  if (typeof val !== "string" || !(PURPOSE_CATEGORIES as readonly string[]).includes(val)) {
    throw new RequestError(400, "VALIDATION_ERROR", "Invalid purpose_category.");
  }
  return val as PurposeCategory;
}

function parsePurposeDetail(val: unknown): string {
  if (val === undefined) return "";
  if (typeof val !== "string" || val.includes("\0") || val.length > MAX_PURPOSE_DETAIL_LENGTH) {
    throw new RequestError(400, "VALIDATION_ERROR", `purpose_detail must be at most ${MAX_PURPOSE_DETAIL_LENGTH} characters.`);
  }
  return val.trim();
}

export function validateRequestInput(input: unknown): SingleRequestInput {
  const invalid = () => new RequestError(400, "VALIDATION_ERROR", "Invalid request.");
  if (!input || typeof input !== "object" || Array.isArray(input)) throw invalid();
  const body = input as Record<string, unknown>;
  const allowed = new Set(["equipment_id", "quantity_requested", "purpose_category", "purpose_detail", "requested_days"]);
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) throw invalid();
  }
  if (!Object.hasOwn(body, "equipment_id") || !Object.hasOwn(body, "quantity_requested")) throw invalid();
  if (typeof body.equipment_id !== "string" || !body.equipment_id.length || body.equipment_id.includes("\0")) throw invalid();
  if (
    typeof body.quantity_requested !== "number" ||
    !Number.isSafeInteger(body.quantity_requested) ||
    body.quantity_requested < 1 ||
    body.quantity_requested > 2_147_483_647
  ) {
    throw invalid();
  }
  return {
    equipment_id: body.equipment_id,
    quantity_requested: body.quantity_requested,
    purpose_category: parsePurposeCategory(body.purpose_category),
    purpose_detail: parsePurposeDetail(body.purpose_detail),
    requested_days: validateRequestedDays(body.requested_days),
  };
}

export function validateBundleInput(input: unknown): BundleRequestInput {
  const invalid = () => new RequestError(400, "VALIDATION_ERROR", "Invalid request bundle.");
  if (!input || typeof input !== "object" || Array.isArray(input)) throw invalid();
  const body = input as Record<string, unknown>;
  const allowed = new Set(["items", "purpose_category", "purpose_detail", "requested_days"]);
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) throw invalid();
  }
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > MAX_BUNDLE_ITEMS) {
    throw new RequestError(
      400,
      "VALIDATION_ERROR",
      `Bundle requests must contain 1 to ${MAX_BUNDLE_ITEMS} distinct items.`,
    );
  }
  const seen = new Set<string>();
  const items: Array<{ equipment_id: string; quantity_requested: number }> = [];
  for (const rawItem of body.items) {
    if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) throw invalid();
    const itemObj = rawItem as Record<string, unknown>;
    const itemKeys = Object.keys(itemObj);
    if (itemKeys.length !== 2 || !Object.hasOwn(itemObj, "equipment_id") || !Object.hasOwn(itemObj, "quantity_requested")) {
      throw invalid();
    }
    if (typeof itemObj.equipment_id !== "string" || !itemObj.equipment_id.length || itemObj.equipment_id.includes("\0")) {
      throw invalid();
    }
    if (seen.has(itemObj.equipment_id)) throw invalid();
    seen.add(itemObj.equipment_id);
    if (
      typeof itemObj.quantity_requested !== "number" ||
      !Number.isSafeInteger(itemObj.quantity_requested) ||
      itemObj.quantity_requested < 1 ||
      itemObj.quantity_requested > 2_147_483_647
    ) {
      throw invalid();
    }
    items.push({ equipment_id: itemObj.equipment_id, quantity_requested: itemObj.quantity_requested });
  }
  return {
    items,
    purpose_category: parsePurposeCategory(body.purpose_category),
    purpose_detail: parsePurposeDetail(body.purpose_detail),
    requested_days: validateRequestedDays(body.requested_days),
  };
}

type QueryDb = Pick<Pool, "query">;
async function hasLoans(db: QueryDb): Promise<boolean> {
  const result = await db.query("SELECT to_regclass('loans') AS loans");
  return result.rows[0].loans !== null;
}

function deriveRequestStatus(row: Record<string, unknown>, now: Date): RequestStatus {
  if (row.fulfilled) return "CHECKED_OUT";
  if (isRowExpired(row, now)) return "EXPIRED";
  const ap = String(row.approval_status ?? "PENDING");
  if (ap === "APPROVED") return "APPROVED";
  if (ap === "REJECTED") return "REJECTED";
  if (ap === "CANCELLED") return "CANCELLED";
  return "PENDING";
}

function requestView(row: Record<string, unknown>, now: Date): BorrowingRequestView {
  const approvalStatus = String(row.approval_status ?? "PENDING") as BorrowingRequestView["approval_status"];
  return {
    id: String(row.id),
    bundle_id: row.bundle_id ? String(row.bundle_id) : null,
    borrower_id: String(row.borrower_id),
    ...(row.borrower_username !== undefined ? { borrower_username: String(row.borrower_username) } : {}),
    equipment_id: String(row.equipment_id),
    ...(row.equipment_name !== undefined ? { equipment_name: String(row.equipment_name) } : {}),
    quantity_requested: Number(row.quantity_requested),
    purpose_category: String(row.purpose_category ?? "OTHER") as PurposeCategory,
    purpose_detail: String(row.purpose_detail ?? ""),
    requested_days: Number(row.requested_days ?? 7),
    approval_status: approvalStatus,
    decision_note: String(row.decision_note ?? ""),
    reviewed_by: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewed_at: row.reviewed_at ? new Date(row.reviewed_at as Date).toISOString() : null,
    expires_at: row.expires_at ? new Date(row.expires_at as Date).toISOString() : null,
    created_at: new Date(row.created_at as Date).toISOString(),
    status: deriveRequestStatus(row, now),
  };
}

function parseDecisionNote(input: unknown): string {
  if (input === undefined || input === null) return "";
  if (typeof input !== "object" || Array.isArray(input)) {
    throw new RequestError(400, "VALIDATION_ERROR", "Invalid request.");
  }
  const obj = input as Record<string, unknown>;
  for (const k of Object.keys(obj)) {
    if (k !== "decision_note") throw new RequestError(400, "VALIDATION_ERROR", "Invalid request.");
  }
  if (obj.decision_note === undefined) return "";
  if (typeof obj.decision_note !== "string" || obj.decision_note.includes("\0") || obj.decision_note.length > 500) {
    throw new RequestError(400, "VALIDATION_ERROR", "Invalid decision_note.");
  }
  return obj.decision_note.trim();
}

async function insertDecisionNotification(
  client: PoolClient,
  borrowerId: string,
  kind: "REQUEST_APPROVED" | "REQUEST_REJECTED",
  referenceId: string,
  equipmentNames: string,
  note: string,
): Promise<void> {
  const title = kind === "REQUEST_APPROVED" ? "Borrowing request approved" : "Borrowing request rejected";
  const detail = note ? ` Note: ${note}` : "";
  const message =
    kind === "REQUEST_APPROVED"
      ? `Your request for ${equipmentNames} was approved and is ready for checkout.${detail}`
      : `Your request for ${equipmentNames} was rejected.${detail}`;
  await client.query(
    `INSERT INTO notifications (id, user_id, kind, reference_id, title, message)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, kind, reference_id) DO NOTHING`,
    [randomUUID(), borrowerId, kind, referenceId, title, message],
  );
}

async function assertPendingSubmissionLimit(client: PoolClient, userId: string, now: Date): Promise<void> {
  await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [userId]);
  const linked = await hasLoans(client);
  const notFulfilled = linked ? "AND NOT EXISTS (SELECT 1 FROM loans l WHERE l.request_id = r.id)" : "";
  const cntRes = await client.query(
    `SELECT COUNT(DISTINCT COALESCE(r.bundle_id, r.id))::int AS cnt
     FROM borrowing_requests r
     WHERE r.borrower_id = $1
       AND r.approval_status = 'PENDING'
       AND (r.expires_at IS NULL OR r.expires_at > $2)
       ${notFulfilled}`,
    [userId, now],
  );
  if (Number(cntRes.rows[0].cnt) >= MAX_ACTIVE_PENDING_REQUESTS) {
    throw new RequestError(
      409,
      "REQUEST_LIMIT_EXCEEDED",
      `You have reached the maximum of ${MAX_ACTIVE_PENDING_REQUESTS} active pending requests.`,
    );
  }
}

export interface RequestServiceOptions {
  now?: () => Date;
  afterInsert?: (client: PoolClient) => Promise<void>;
}

export class BorrowingRequestService {
  constructor(private readonly pool: Pool, private readonly options: RequestServiceOptions = {}) {}

  private currentTime(): Date {
    return (this.options.now ?? (() => new Date()))();
  }

  async create(user: SessionUser, input: unknown): Promise<BorrowingRequestView> {
    if (user.role !== "BORROWER") throw new RequestError(403, "FORBIDDEN", "Access denied.");
    const body = validateRequestInput(input);
    const now = this.currentTime();
    const expiresAt = addDays(now, PENDING_EXPIRY_DAYS);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
      await assertPendingSubmissionLimit(client, user.id, now);
      const equipment = await client.query("SELECT id, name, catalog_status FROM equipment WHERE id = $1 FOR UPDATE", [
        body.equipment_id,
      ]);
      if (!equipment.rowCount) throw new RequestError(404, "NOT_FOUND", "Resource not found.");
      if (equipment.rows[0].catalog_status === "RETIRED") {
        throw new RequestError(409, "EQUIPMENT_RETIRED", "This equipment is retired and cannot be borrowed.");
      }
      const stock = await getEquipment(client, body.equipment_id);
      assertRequestAvailable(stock!.quantity_available);
      if (body.quantity_requested > stock!.quantity_available) {
        throw new RequestError(409, "INSUFFICIENT_AVAILABILITY", "Requested quantity exceeds current availability.");
      }
      const result = await client.query(
        `INSERT INTO borrowing_requests
           (id, borrower_id, equipment_id, quantity_requested, purpose_category, purpose_detail, requested_days, approval_status, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, $9)
         RETURNING *, false AS fulfilled`,
        [
          randomUUID(),
          user.id,
          body.equipment_id,
          body.quantity_requested,
          body.purpose_category,
          body.purpose_detail,
          body.requested_days,
          now,
          expiresAt,
        ],
      );
      await this.options.afterInsert?.(client);
      await client.query("COMMIT");
      return requestView(
        {
          ...result.rows[0],
          borrower_username: user.username,
          equipment_name: equipment.rows[0].name,
        },
        now,
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async createBundle(user: SessionUser, input: unknown): Promise<{ bundle_id: string; requests: BorrowingRequestView[] }> {
    if (user.role !== "BORROWER") throw new RequestError(403, "FORBIDDEN", "Access denied.");
    const body = validateBundleInput(input);
    const now = this.currentTime();
    const expiresAt = addDays(now, PENDING_EXPIRY_DAYS);
    const sortedIds = [...body.items].map((i) => i.equipment_id).sort((a, b) => a.localeCompare(b));
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
      await assertPendingSubmissionLimit(client, user.id, now);
      const locked = await client.query(
        `SELECT id, name, catalog_status FROM equipment WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE`,
        [sortedIds],
      );
      if ((locked.rowCount ?? 0) !== sortedIds.length) {
        throw new RequestError(404, "NOT_FOUND", "One or more equipment items were not found.");
      }
      const nameById = new Map<string, string>();
      for (const row of locked.rows) {
        if (row.catalog_status === "RETIRED") {
          throw new RequestError(409, "EQUIPMENT_RETIRED", "Retired equipment cannot be requested.");
        }
        nameById.set(String(row.id), String(row.name));
      }
      for (const item of body.items) {
        const stock = await getEquipment(client, item.equipment_id);
        assertRequestAvailable(stock!.quantity_available);
        if (item.quantity_requested > stock!.quantity_available) {
          throw new RequestError(409, "INSUFFICIENT_AVAILABILITY", "Requested quantity exceeds current availability.");
        }
      }
      const bundleId = randomUUID();
      await client.query(
        `INSERT INTO request_bundles (id, borrower_id, purpose_category, purpose_detail, requested_days, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [bundleId, user.id, body.purpose_category, body.purpose_detail, body.requested_days, now],
      );
      const requests: BorrowingRequestView[] = [];
      for (const item of body.items) {
        const inserted = await client.query(
          `INSERT INTO borrowing_requests
             (id, bundle_id, borrower_id, equipment_id, quantity_requested, purpose_category, purpose_detail, requested_days, approval_status, created_at, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', $9, $10)
           RETURNING *, false AS fulfilled`,
          [
            randomUUID(),
            bundleId,
            user.id,
            item.equipment_id,
            item.quantity_requested,
            body.purpose_category,
            body.purpose_detail,
            body.requested_days,
            now,
            expiresAt,
          ],
        );
        requests.push(
          requestView(
            {
              ...inserted.rows[0],
              borrower_username: user.username,
              equipment_name: nameById.get(item.equipment_id),
            },
            now,
          ),
        );
      }
      await this.options.afterInsert?.(client);
      await client.query("COMMIT");
      return { bundle_id: bundleId, requests };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async list(user: SessionUser, filter: { status?: string; q?: string } = {}): Promise<BorrowingRequestView[]> {
    const now = this.currentTime();
    const linked = await hasLoans(this.pool);
    const fulfilled = linked ? "EXISTS (SELECT 1 FROM loans l WHERE l.request_id = r.id)" : "false";
    const predicate =
      user.role === "BORROWER"
        ? "r.borrower_id = $1"
        : `NOT (${fulfilled}) AND r.approval_status IN ('PENDING', 'APPROVED') AND (r.expires_at IS NULL OR r.expires_at > $1)`;
    const result = await this.pool.query(
      `SELECT r.*, ${fulfilled} AS fulfilled, u.username AS borrower_username, e.name AS equipment_name
       FROM borrowing_requests r
       JOIN users u ON u.id = r.borrower_id
       JOIN equipment e ON e.id = r.equipment_id
       WHERE ${predicate}
       ORDER BY r.created_at DESC, r.id`,
      user.role === "BORROWER" ? [user.id] : [now],
    );
    let rows = result.rows.map((r) => requestView(r, now));
    if (filter.status && filter.status !== "ALL") {
      rows = rows.filter((r) => r.status === filter.status);
    }
    if (filter.q && filter.q.trim()) {
      const q = filter.q.trim().replace(/^#/, "").toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.equipment_name ?? "").toLowerCase().includes(q) ||
          (r.borrower_username ?? "").toLowerCase().includes(q) ||
          r.purpose_detail.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          shortRef(r.id).includes(q) ||
          (r.bundle_id ? r.bundle_id.toLowerCase().includes(q) || shortRef(r.bundle_id).includes(q) : false),
      );
    }
    return rows;
  }

  async get(user: SessionUser, id: string): Promise<BorrowingRequestView> {
    if (!id || id.includes("\0")) throw new RequestError(400, "VALIDATION_ERROR", "Invalid request.");
    const now = this.currentTime();
    const linked = await hasLoans(this.pool);
    const fulfilled = linked ? "EXISTS (SELECT 1 FROM loans l WHERE l.request_id = r.id)" : "false";
    const result = await this.pool.query(
      `SELECT r.*, ${fulfilled} AS fulfilled, u.username AS borrower_username, e.name AS equipment_name
       FROM borrowing_requests r
       JOIN users u ON u.id = r.borrower_id
       JOIN equipment e ON e.id = r.equipment_id
       WHERE r.id = $1`,
      [id],
    );
    if (!result.rowCount) throw new RequestError(404, "NOT_FOUND", "Resource not found.");
    const row = result.rows[0];
    if (user.role === "BORROWER" && row.borrower_id !== user.id) {
      throw new RequestError(403, "FORBIDDEN", "Access denied.");
    }
    if (
      user.role === "CUSTODIAN" &&
      (row.fulfilled || row.approval_status === "REJECTED" || row.approval_status === "CANCELLED" || isRowExpired(row, now))
    ) {
      throw new RequestError(403, "FORBIDDEN", "Access denied.");
    }
    return requestView(row, now);
  }

  async decide(
    user: SessionUser,
    id: string,
    decision: "APPROVED" | "REJECTED",
    input: unknown,
  ): Promise<BorrowingRequestView> {
    if (user.role !== "CUSTODIAN") throw new RequestError(403, "FORBIDDEN", "Access denied.");
    if (!id || id.includes("\0")) throw new RequestError(400, "VALIDATION_ERROR", "Invalid request.");
    const note = parseDecisionNote(input);
    const now = this.currentTime();
    const nextExpiry = decision === "APPROVED" ? addDays(now, APPROVED_EXPIRY_DAYS) : null;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
      const locked = await client.query(
        `SELECT r.*, e.name AS equipment_name, u.username AS borrower_username,
                EXISTS (SELECT 1 FROM loans l WHERE l.request_id = r.id) AS fulfilled
         FROM borrowing_requests r
         JOIN equipment e ON e.id = r.equipment_id
         JOIN users u ON u.id = r.borrower_id
         WHERE r.id = $1 FOR UPDATE OF r`,
        [id],
      );
      if (!locked.rowCount) throw new RequestError(404, "NOT_FOUND", "Resource not found.");
      const row = locked.rows[0];
      if (isRowExpired(row, now)) {
        throw new RequestError(409, "REQUEST_EXPIRED", "This request has expired.");
      }
      if (row.fulfilled || row.approval_status !== "PENDING") {
        throw new RequestError(409, "INVALID_STATE_TRANSITION", "Only pending requests can be approved or rejected.");
      }
      const updated = await client.query(
        `UPDATE borrowing_requests
         SET approval_status = $2, reviewed_by = $3, reviewed_at = $5, decision_note = $4, expires_at = $6
         WHERE id = $1
         RETURNING *, false AS fulfilled`,
        [id, decision, user.id, note, now, nextExpiry],
      );
      await insertDecisionNotification(
        client,
        String(row.borrower_id),
        decision === "APPROVED" ? "REQUEST_APPROVED" : "REQUEST_REJECTED",
        id,
        String(row.equipment_name),
        note,
      );
      await client.query("COMMIT");
      return requestView(
        {
          ...updated.rows[0],
          equipment_name: row.equipment_name,
          borrower_username: row.borrower_username,
        },
        now,
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async decideBundle(
    user: SessionUser,
    bundleId: string,
    decision: "APPROVED" | "REJECTED",
    input: unknown,
  ): Promise<BorrowingRequestView[]> {
    if (user.role !== "CUSTODIAN") throw new RequestError(403, "FORBIDDEN", "Access denied.");
    if (!bundleId || bundleId.includes("\0")) throw new RequestError(400, "VALIDATION_ERROR", "Invalid request.");
    const note = parseDecisionNote(input);
    const now = this.currentTime();
    const nextExpiry = decision === "APPROVED" ? addDays(now, APPROVED_EXPIRY_DAYS) : null;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
      const locked = await client.query(
        `SELECT r.*, e.name AS equipment_name, u.username AS borrower_username,
                EXISTS (SELECT 1 FROM loans l WHERE l.request_id = r.id) AS fulfilled
         FROM borrowing_requests r
         JOIN equipment e ON e.id = r.equipment_id
         JOIN users u ON u.id = r.borrower_id
         WHERE r.bundle_id = $1 ORDER BY r.id FOR UPDATE OF r`,
        [bundleId],
      );
      if (!locked.rowCount) throw new RequestError(404, "NOT_FOUND", "Resource not found.");
      for (const row of locked.rows) {
        if (isRowExpired(row, now)) {
          throw new RequestError(409, "REQUEST_EXPIRED", "This bundle request has expired.");
        }
        if (row.fulfilled || row.approval_status !== "PENDING") {
          throw new RequestError(409, "INVALID_STATE_TRANSITION", "Only pending bundles can be approved or rejected.");
        }
      }
      const updated = await client.query(
        `UPDATE borrowing_requests
         SET approval_status = $2, reviewed_by = $3, reviewed_at = $5, decision_note = $4, expires_at = $6
         WHERE bundle_id = $1
         RETURNING *, false AS fulfilled`,
        [bundleId, decision, user.id, note, now, nextExpiry],
      );
      const names = locked.rows.map((r) => String(r.equipment_name)).join(", ");
      await insertDecisionNotification(
        client,
        String(locked.rows[0].borrower_id),
        decision === "APPROVED" ? "REQUEST_APPROVED" : "REQUEST_REJECTED",
        bundleId,
        names,
        note,
      );
      await client.query("COMMIT");
      return updated.rows.map((r) => {
        const match = locked.rows.find((lr) => lr.id === r.id);
        return requestView(
          {
            ...r,
            equipment_name: match?.equipment_name,
            borrower_username: match?.borrower_username,
          },
          now,
        );
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async cancel(user: SessionUser, id: string): Promise<BorrowingRequestView> {
    if (user.role !== "BORROWER") throw new RequestError(403, "FORBIDDEN", "Access denied.");
    if (!id || id.includes("\0")) throw new RequestError(400, "VALIDATION_ERROR", "Invalid request.");
    const now = this.currentTime();
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
      const locked = await client.query(
        `SELECT r.*, e.name AS equipment_name, u.username AS borrower_username,
                EXISTS (SELECT 1 FROM loans l WHERE l.request_id = r.id) AS fulfilled
         FROM borrowing_requests r
         JOIN equipment e ON e.id = r.equipment_id
         JOIN users u ON u.id = r.borrower_id
         WHERE r.id = $1 FOR UPDATE OF r`,
        [id],
      );
      if (!locked.rowCount) throw new RequestError(404, "NOT_FOUND", "Resource not found.");
      const row = locked.rows[0];
      if (row.borrower_id !== user.id) throw new RequestError(403, "FORBIDDEN", "Access denied.");
      if (isRowExpired(row, now)) {
        throw new RequestError(409, "REQUEST_EXPIRED", "Expired requests cannot be cancelled.");
      }
      if (row.fulfilled || (row.approval_status !== "PENDING" && row.approval_status !== "APPROVED")) {
        throw new RequestError(409, "INVALID_STATE_TRANSITION", "Only unfulfilled pending or approved requests can be cancelled.");
      }
      const updated = await client.query(
        `UPDATE borrowing_requests SET approval_status = 'CANCELLED', expires_at = NULL WHERE id = $1 RETURNING *, false AS fulfilled`,
        [id],
      );
      await client.query("COMMIT");
      return requestView(
        {
          ...updated.rows[0],
          equipment_name: row.equipment_name,
          borrower_username: row.borrower_username,
        },
        now,
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async cancelBundle(user: SessionUser, bundleId: string): Promise<BorrowingRequestView[]> {
    if (user.role !== "BORROWER") throw new RequestError(403, "FORBIDDEN", "Access denied.");
    if (!bundleId || bundleId.includes("\0")) throw new RequestError(400, "VALIDATION_ERROR", "Invalid request.");
    const now = this.currentTime();
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
      const locked = await client.query(
        `SELECT r.*, e.name AS equipment_name, u.username AS borrower_username,
                EXISTS (SELECT 1 FROM loans l WHERE l.request_id = r.id) AS fulfilled
         FROM borrowing_requests r
         JOIN equipment e ON e.id = r.equipment_id
         JOIN users u ON u.id = r.borrower_id
         WHERE r.bundle_id = $1 ORDER BY r.id FOR UPDATE OF r`,
        [bundleId],
      );
      if (!locked.rowCount) throw new RequestError(404, "NOT_FOUND", "Resource not found.");
      if (locked.rows[0].borrower_id !== user.id) throw new RequestError(403, "FORBIDDEN", "Access denied.");
      for (const row of locked.rows) {
        if (isRowExpired(row, now)) {
          throw new RequestError(409, "REQUEST_EXPIRED", "Expired bundle requests cannot be cancelled.");
        }
        if (row.fulfilled || (row.approval_status !== "PENDING" && row.approval_status !== "APPROVED")) {
          throw new RequestError(409, "INVALID_STATE_TRANSITION", "Bundle cannot be cancelled in its current state.");
        }
      }
      const updated = await client.query(
        `UPDATE borrowing_requests SET approval_status = 'CANCELLED', expires_at = NULL WHERE bundle_id = $1 RETURNING *, false AS fulfilled`,
        [bundleId],
      );
      await client.query("COMMIT");
      return updated.rows.map((r) => {
        const match = locked.rows.find((lr) => lr.id === r.id);
        return requestView(
          {
            ...r,
            equipment_name: match?.equipment_name,
            borrower_username: match?.borrower_username,
          },
          now,
        );
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
