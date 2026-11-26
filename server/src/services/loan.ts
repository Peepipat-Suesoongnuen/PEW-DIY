import { randomUUID } from "crypto";
import type { Pool, PoolClient } from "pg";
import { isRequestExpired, RequestError } from "./borrowing-request";
import { getEquipment } from "./catalog";
import type { SessionUser } from "./session";

export function assertCheckoutAvailable(total: number, held: number, quantity: number): void {
  if (![total, held, quantity].every(Number.isSafeInteger) || total < 0 || held < 0 || held > total || quantity < 1) {
    throw new Error("AVAILABILITY_INTEGRITY_ERROR");
  }
  if (quantity > total - held) throw new RequestError(409, "INSUFFICIENT_AVAILABILITY", "Requested quantity exceeds current availability.");
}

/** Business calendar date YYYY-MM-DD in an explicit IANA zone, independent of host OS zone. */
export function businessDateInZone(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
  const value = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const date = new Date(Date.UTC(value("year"), value("month") - 1, value("day")));
  return date.toISOString().slice(0, 10);
}

/** Due date = checkout business calendar date + requestedDays (1..14, default 7). */
export function checkoutDueOn(instant: Date, timeZone: string, requestedDays = 7): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
  const value = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const date = new Date(Date.UTC(value("year"), value("month") - 1, value("day") + requestedDays));
  return date.toISOString().slice(0, 10);
}

/** Derived overdue status (BR-08): unreturned AND business_today > due_on in Asia/Bangkok. */
export function isLoanOverdue(dueOn: string, returnedAt: string | null, businessToday: string): boolean {
  if (returnedAt !== null) return false;
  return businessToday > dueOn;
}

export type LoanStatus = "ACTIVE" | "RETURN_PENDING" | "RETURNED";
export type LoanScope = "active" | "overdue" | "history" | "all";

export interface LoanView {
  id: string;
  request_id: string;
  bundle_id: string | null;
  borrower_id: string;
  borrower_username: string;
  equipment_id: string;
  equipment_name: string;
  quantity_borrowed: number;
  requested_days: number;
  checked_out_by: string;
  checked_out_by_username: string;
  checkout_at: string;
  due_on: string;
  return_requested_at: string | null;
  return_requested_by: string | null;
  return_note: string;
  returned_at: string | null;
  returned_by: string | null;
  status: LoanStatus;
  overdue: boolean;
}
const projection = `SELECT l.id,l.request_id,r.bundle_id,r.borrower_id,u.username AS borrower_username,
  r.equipment_id,e.name AS equipment_name,l.quantity_borrowed,r.requested_days,
  l.checked_out_by,cu.username AS checked_out_by_username,l.checkout_at,l.due_on::text AS due_on,
  l.return_requested_at,l.return_requested_by,l.return_note,l.returned_at,l.returned_by
  FROM loans l
  JOIN borrowing_requests r ON r.id=l.request_id
  JOIN users u ON u.id=r.borrower_id
  LEFT JOIN users cu ON cu.id=l.checked_out_by
  JOIN equipment e ON e.id=r.equipment_id`;
function view(row: Record<string, unknown>, businessToday: string): LoanView {
  const returnedAt = row.returned_at ? new Date(row.returned_at as Date).toISOString() : null;
  const returnRequestedAt = row.return_requested_at ? new Date(row.return_requested_at as Date).toISOString() : null;
  const status: LoanStatus = returnedAt ? "RETURNED" : returnRequestedAt ? "RETURN_PENDING" : "ACTIVE";
  const dueOn = String(row.due_on);
  return {
    id: String(row.id),
    request_id: String(row.request_id),
    bundle_id: row.bundle_id ? String(row.bundle_id) : null,
    borrower_id: String(row.borrower_id),
    borrower_username: String(row.borrower_username ?? row.borrower_id),
    equipment_id: String(row.equipment_id),
    equipment_name: String(row.equipment_name ?? row.equipment_id),
    quantity_borrowed: Number(row.quantity_borrowed),
    requested_days: Number(row.requested_days ?? 7),
    checked_out_by: String(row.checked_out_by),
    checked_out_by_username: String(row.checked_out_by_username ?? row.checked_out_by),
    checkout_at: new Date(row.checkout_at as Date).toISOString(),
    due_on: dueOn,
    return_requested_at: returnRequestedAt,
    return_requested_by: row.return_requested_by ? String(row.return_requested_by) : null,
    return_note: String(row.return_note ?? ""),
    returned_at: returnedAt,
    returned_by: row.returned_by ? String(row.returned_by) : null,
    status,
    overdue: isLoanOverdue(dueOn, returnedAt, businessToday),
  };
}
function validId(id: string) {
  if (!id || id.includes("\0")) throw new RequestError(400, "VALIDATION_ERROR", "Invalid request.");
}
function parseReturnNote(input: unknown): string {
  if (input === undefined || input === null) return "";
  if (typeof input !== "object" || Array.isArray(input)) {
    throw new RequestError(400, "VALIDATION_ERROR", "Invalid request.");
  }
  const obj = input as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (key !== "return_note") throw new RequestError(400, "VALIDATION_ERROR", "Invalid request.");
  }
  if (obj.return_note === undefined || obj.return_note === null) return "";
  if (typeof obj.return_note !== "string" || obj.return_note.includes("\0") || obj.return_note.length > 500) {
    throw new RequestError(400, "VALIDATION_ERROR", "Invalid return note.");
  }
  return obj.return_note.trim();
}
export interface LoanServiceOptions {
  timeZone?: string;
  now?: () => Date;
  /** Test-only constructor seam. Never enabled by HTTP input or runtime config. */
  afterInsert?: (client: PoolClient) => Promise<void>;
}
export class LoanService {
  constructor(private readonly pool: Pool, private readonly options: LoanServiceOptions = {}) {}

  getClockOptions(): { timeZone?: string; now?: () => Date } {
    return { timeZone: this.options.timeZone, now: this.options.now };
  }

  private businessToday(): string {
    const tz = this.options.timeZone || "Asia/Bangkok";
    const now = (this.options.now ?? (() => new Date()))();
    return businessDateInZone(now, tz);
  }

  async checkout(user: SessionUser, requestId: string, input: unknown): Promise<LoanView> {
    if (user.role !== "CUSTODIAN") throw new RequestError(403, "FORBIDDEN", "Access denied.");
    validId(requestId);
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length) {
      throw new RequestError(400, "VALIDATION_ERROR", "Invalid request.");
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
      const reference = await client.query("SELECT equipment_id FROM borrowing_requests WHERE id=$1", [requestId]);
      if (!reference.rowCount) throw new RequestError(404, "NOT_FOUND", "Resource not found.");
      const equipmentId = reference.rows[0].equipment_id;
      await client.query("SELECT id FROM equipment WHERE id=$1 FOR UPDATE", [equipmentId]);
      const locked = await client.query("SELECT * FROM borrowing_requests WHERE id=$1 FOR UPDATE", [requestId]);
      if (!locked.rowCount) throw new RequestError(404, "NOT_FOUND", "Resource not found.");
      const record = locked.rows[0];
      if (record.equipment_id !== equipmentId) throw new Error("REQUEST_REFERENCE_CHANGED");
      if ((await client.query("SELECT id FROM loans WHERE request_id=$1", [requestId])).rowCount) {
        throw new RequestError(409, "ALREADY_CHECKED_OUT", "Request has already been checked out.");
      }
      if (record.approval_status !== "APPROVED") {
        throw new RequestError(409, "NOT_APPROVED", "Request must be approved before checkout.");
      }
      if (!this.options.timeZone) throw new RequestError(503, "CALENDAR_POLICY_UNCONFIGURED", "Checkout is temporarily unavailable.");
      const now = (this.options.now ?? (() => new Date()))();
      if (isRequestExpired(record.expires_at, now)) {
        throw new RequestError(409, "REQUEST_EXPIRED", "Approved request has expired and cannot be checked out.");
      }
      const stock = await getEquipment(client, equipmentId);
      if (!stock) throw new RequestError(404, "NOT_FOUND", "Resource not found.");
      assertCheckoutAvailable(stock.quantity_total, stock.quantity_total - stock.quantity_available, record.quantity_requested);
      const days = Number(record.requested_days ?? 7);
      const dueOn = checkoutDueOn(now, this.options.timeZone, days);
      const id = randomUUID();
      await client.query(`INSERT INTO loans(id,request_id,quantity_borrowed,checked_out_by,checkout_at,due_on)
        VALUES($1,$2,$3,$4,$5,$6)`, [id, requestId, record.quantity_requested, user.id, now, dueOn]);
      await this.options.afterInsert?.(client);
      const result = await client.query(`${projection} WHERE l.id=$1`, [id]);
      const loan = view(result.rows[0], this.businessToday());
      await client.query("COMMIT");
      return loan;
    } catch (error) {
      await client.query("ROLLBACK");
      const code = (error as { code?: string }).code;
      if (code === "23505") throw new RequestError(409, "ALREADY_CHECKED_OUT", "Request has already been checked out.");
      if (["40P01", "40001", "55P03"].includes(code ?? "")) {
        throw new RequestError(503, "RETRY_LATER", "Checkout is temporarily unavailable. Refresh requests before retrying.");
      }
      throw error;
    } finally { client.release(); }
  }

  async checkoutBundle(user: SessionUser, bundleId: string, input: unknown): Promise<LoanView[]> {
    if (user.role !== "CUSTODIAN") throw new RequestError(403, "FORBIDDEN", "Access denied.");
    validId(bundleId);
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length) {
      throw new RequestError(400, "VALIDATION_ERROR", "Invalid request.");
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
      const refs = await client.query(
        `SELECT id, equipment_id FROM borrowing_requests WHERE bundle_id=$1 ORDER BY equipment_id`,
        [bundleId],
      );
      if (!refs.rowCount) throw new RequestError(404, "NOT_FOUND", "Resource not found.");
      const equipmentIds = [...new Set(refs.rows.map((r) => String(r.equipment_id)))].sort((a, b) => a.localeCompare(b));
      await client.query(`SELECT id FROM equipment WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE`, [equipmentIds]);
      const lockedReqs = await client.query(
        `SELECT * FROM borrowing_requests WHERE bundle_id=$1 ORDER BY id FOR UPDATE`,
        [bundleId],
      );
      if (!this.options.timeZone) {
        throw new RequestError(503, "CALENDAR_POLICY_UNCONFIGURED", "Checkout is temporarily unavailable.");
      }
      const now = (this.options.now ?? (() => new Date()))();
      const createdIds: string[] = [];
      for (const record of lockedReqs.rows) {
        if ((await client.query("SELECT id FROM loans WHERE request_id=$1", [record.id])).rowCount) {
          throw new RequestError(409, "ALREADY_CHECKED_OUT", "Request has already been checked out.");
        }
        if (record.approval_status !== "APPROVED") {
          throw new RequestError(409, "NOT_APPROVED", "Bundle must be approved before checkout.");
        }
        if (isRequestExpired(record.expires_at, now)) {
          throw new RequestError(409, "REQUEST_EXPIRED", "Approved bundle request has expired and cannot be checked out.");
        }
        const stock = await getEquipment(client, String(record.equipment_id));
        if (!stock) throw new RequestError(404, "NOT_FOUND", "Resource not found.");
        assertCheckoutAvailable(stock.quantity_total, stock.quantity_total - stock.quantity_available, record.quantity_requested);
        const days = Number(record.requested_days ?? 7);
        const dueOn = checkoutDueOn(now, this.options.timeZone, days);
        const id = randomUUID();
        await client.query(
          `INSERT INTO loans(id, request_id, quantity_borrowed, checked_out_by, checkout_at, due_on)
           VALUES($1, $2, $3, $4, $5, $6)`,
          [id, record.id, record.quantity_requested, user.id, now, dueOn],
        );
        createdIds.push(id);
      }
      await this.options.afterInsert?.(client);
      const result = await client.query(`${projection} WHERE l.id = ANY($1::text[]) ORDER BY l.id`, [createdIds]);
      const today = this.businessToday();
      const loans = result.rows.map((r) => view(r, today));
      await client.query("COMMIT");
      return loans;
    } catch (error) {
      await client.query("ROLLBACK");
      const code = (error as { code?: string }).code;
      if (code === "23505") throw new RequestError(409, "ALREADY_CHECKED_OUT", "Request has already been checked out.");
      if (["40P01", "40001", "55P03"].includes(code ?? "")) {
        throw new RequestError(503, "RETRY_LATER", "Checkout is temporarily unavailable. Refresh requests before retrying.");
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async list(user: SessionUser, scope: LoanScope = "active"): Promise<LoanView[]> {
    if (!["active", "overdue", "history", "all"].includes(scope)) {
      throw new RequestError(400, "VALIDATION_ERROR", "Invalid loan scope.");
    }
    if (scope === "overdue" && user.role !== "CUSTODIAN") {
      throw new RequestError(403, "FORBIDDEN", "Access denied.");
    }
    const today = this.businessToday();
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (user.role === "BORROWER") {
      params.push(user.id);
      conditions.push(`r.borrower_id = $${params.length}`);
    }
    if (scope === "active" || scope === "overdue") {
      conditions.push("l.returned_at IS NULL");
    } else if (scope === "history") {
      conditions.push("l.returned_at IS NOT NULL");
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const orderBy = scope === "overdue" ? "ORDER BY l.due_on ASC, l.id" : "ORDER BY l.checkout_at DESC, l.id";
    const result = await this.pool.query(
      `${projection} ${whereClause} ${orderBy}`,
      params,
    );
    const mapped = result.rows.map((r) => view(r, today));
    return scope === "overdue" ? mapped.filter((l) => l.overdue) : mapped;
  }

  async get(user: SessionUser, id: string): Promise<LoanView> {
    validId(id);
    const result = await this.pool.query(`${projection} WHERE l.id=$1`, [id]);
    if (!result.rowCount) throw new RequestError(404, "NOT_FOUND", "Resource not found.");
    const row = result.rows[0];
    if (user.role === "BORROWER" && row.borrower_id !== user.id) {
      throw new RequestError(403, "FORBIDDEN", "Access denied.");
    }
    return view(row, this.businessToday());
  }

  async requestReturn(user: SessionUser, id: string, input: unknown): Promise<LoanView> {
    if (user.role !== "BORROWER") throw new RequestError(403, "FORBIDDEN", "Access denied.");
    validId(id);
    const note = parseReturnNote(input);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
      const existing = await client.query(
        `SELECT l.id, l.returned_at, r.borrower_id
         FROM loans l JOIN borrowing_requests r ON r.id = l.request_id
         WHERE l.id = $1 FOR UPDATE`,
        [id],
      );
      if (!existing.rowCount) throw new RequestError(404, "NOT_FOUND", "Resource not found.");
      const row = existing.rows[0];
      if (row.borrower_id !== user.id) throw new RequestError(403, "FORBIDDEN", "Access denied.");
      if (row.returned_at !== null) {
        throw new RequestError(409, "ALREADY_RETURNED", "This loan has already been returned.");
      }
      const now = (this.options.now ?? (() => new Date()))();
      await client.query(
        `UPDATE loans
         SET return_requested_at = COALESCE(return_requested_at, $2),
             return_requested_by = COALESCE(return_requested_by, $3),
             return_note = CASE WHEN $4 <> '' THEN $4 ELSE return_note END
         WHERE id = $1`,
        [id, now, user.id, note],
      );
      const result = await client.query(`${projection} WHERE l.id = $1`, [id]);
      const loan = view(result.rows[0], this.businessToday());
      await client.query("COMMIT");
      return loan;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async requestBundleReturn(user: SessionUser, bundleId: string, input: unknown): Promise<LoanView[]> {
    if (user.role !== "BORROWER") throw new RequestError(403, "FORBIDDEN", "Access denied.");
    validId(bundleId);
    const note = parseReturnNote(input);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
      const locked = await client.query(
        `SELECT l.id, l.returned_at, r.borrower_id
         FROM loans l JOIN borrowing_requests r ON r.id = l.request_id
         WHERE r.bundle_id = $1 ORDER BY l.id FOR UPDATE OF l`,
        [bundleId],
      );
      if (!locked.rowCount) throw new RequestError(404, "NOT_FOUND", "Resource not found.");
      if (locked.rows.some((r) => r.borrower_id !== user.id)) {
        throw new RequestError(403, "FORBIDDEN", "Access denied.");
      }
      const activeIds = locked.rows.filter((r) => r.returned_at === null).map((r) => String(r.id));
      if (!activeIds.length) {
        throw new RequestError(409, "ALREADY_RETURNED", "All loans in this bundle have already been returned.");
      }
      const now = (this.options.now ?? (() => new Date()))();
      await client.query(
        `UPDATE loans
         SET return_requested_at = COALESCE(return_requested_at, $2),
             return_requested_by = COALESCE(return_requested_by, $3),
             return_note = CASE WHEN $4 <> '' THEN $4 ELSE return_note END
         WHERE id = ANY($1::text[])`,
        [activeIds, now, user.id, note],
      );
      const result = await client.query(`${projection} WHERE l.id = ANY($1::text[]) ORDER BY l.id`, [activeIds]);
      const today = this.businessToday();
      const loans = result.rows.map((r) => view(r, today));
      await client.query("COMMIT");
      return loans;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async confirmReturn(user: SessionUser, id: string, input: unknown): Promise<LoanView> {
    if (user.role !== "CUSTODIAN") throw new RequestError(403, "FORBIDDEN", "Access denied.");
    validId(id);
    const note = parseReturnNote(input);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
      const ref = await client.query(
        `SELECT r.equipment_id FROM loans l JOIN borrowing_requests r ON r.id = l.request_id WHERE l.id = $1`,
        [id],
      );
      if (!ref.rowCount) throw new RequestError(404, "NOT_FOUND", "Resource not found.");
      await client.query(`SELECT id FROM equipment WHERE id = $1 FOR UPDATE`, [String(ref.rows[0].equipment_id)]);
      const locked = await client.query(`SELECT id, returned_at FROM loans WHERE id = $1 FOR UPDATE`, [id]);
      if (!locked.rowCount) throw new RequestError(404, "NOT_FOUND", "Resource not found.");
      if (locked.rows[0].returned_at !== null) {
        throw new RequestError(409, "ALREADY_RETURNED", "This loan has already been returned.");
      }
      const now = (this.options.now ?? (() => new Date()))();
      await client.query(
        `UPDATE loans
         SET returned_at = $2,
             returned_by = $3,
             return_note = CASE WHEN $4 <> '' THEN $4 ELSE return_note END
         WHERE id = $1`,
        [id, now, user.id, note],
      );
      await this.options.afterInsert?.(client);
      const result = await client.query(`${projection} WHERE l.id = $1`, [id]);
      const loan = view(result.rows[0], this.businessToday());
      await client.query("COMMIT");
      return loan;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async confirmBundleReturn(user: SessionUser, bundleId: string, input: unknown): Promise<LoanView[]> {
    if (user.role !== "CUSTODIAN") throw new RequestError(403, "FORBIDDEN", "Access denied.");
    validId(bundleId);
    const note = parseReturnNote(input);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
      const refs = await client.query(
        `SELECT l.id, r.equipment_id
         FROM loans l JOIN borrowing_requests r ON r.id = l.request_id
         WHERE r.bundle_id = $1
         ORDER BY r.equipment_id`,
        [bundleId],
      );
      if (!refs.rowCount) throw new RequestError(404, "NOT_FOUND", "Resource not found.");
      const equipmentIds = [...new Set(refs.rows.map((r) => String(r.equipment_id)))].sort((a, b) => a.localeCompare(b));
      await client.query(`SELECT id FROM equipment WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE`, [equipmentIds]);
      const loanIds = refs.rows.map((r) => String(r.id)).sort((a, b) => a.localeCompare(b));
      const locked = await client.query(
        `SELECT id, returned_at FROM loans WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE`,
        [loanIds],
      );
      const activeIds = locked.rows.filter((r) => r.returned_at === null).map((r) => String(r.id));
      if (!activeIds.length) {
        throw new RequestError(409, "ALREADY_RETURNED", "All loans in this bundle have already been returned.");
      }
      const now = (this.options.now ?? (() => new Date()))();
      await client.query(
        `UPDATE loans
         SET returned_at = $2,
             returned_by = $3,
             return_note = CASE WHEN $4 <> '' THEN $4 ELSE return_note END
         WHERE id = ANY($1::text[])`,
        [activeIds, now, user.id, note],
      );
      await this.options.afterInsert?.(client);
      const result = await client.query(`${projection} WHERE l.id = ANY($1::text[]) ORDER BY l.id`, [activeIds]);
      const today = this.businessToday();
      const loans = result.rows.map((r) => view(r, today));
      await client.query("COMMIT");
      return loans;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
