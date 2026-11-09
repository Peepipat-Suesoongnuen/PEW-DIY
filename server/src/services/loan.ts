import { randomUUID } from "crypto";
import type { Pool, PoolClient } from "pg";
import { RequestError } from "./borrowing-request";
import { getEquipment } from "./catalog";
import type { SessionUser } from "./session";

export function assertCheckoutAvailable(total: number, held: number, quantity: number): void {
  if (![total, held, quantity].every(Number.isSafeInteger) || total < 0 || held < 0 || held > total || quantity < 1) {
    throw new Error("AVAILABILITY_INTEGRITY_ERROR");
  }
  if (quantity > total - held) throw new RequestError(409, "INSUFFICIENT_AVAILABILITY", "Requested quantity exceeds current availability.");
}

/** A calendar date in an explicit IANA zone, independent of the host timezone. */
export function checkoutDueOn(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
  const value = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const date = new Date(Date.UTC(value("year"), value("month") - 1, value("day") + 7));
  return date.toISOString().slice(0, 10);
}

export interface LoanView {
  id: string; request_id: string; borrower_id: string; equipment_id: string;
  quantity_borrowed: number; checked_out_by: string; checkout_at: string; due_on: string; status: "ACTIVE";
}
const projection = `SELECT l.id,l.request_id,r.borrower_id,r.equipment_id,l.quantity_borrowed,
  l.checked_out_by,l.checkout_at,l.due_on::text AS due_on FROM loans l
  JOIN borrowing_requests r ON r.id=l.request_id`;
function view(row: Record<string, unknown>): LoanView {
  return { id: String(row.id), request_id: String(row.request_id), borrower_id: String(row.borrower_id),
    equipment_id: String(row.equipment_id), quantity_borrowed: Number(row.quantity_borrowed),
    checked_out_by: String(row.checked_out_by), checkout_at: new Date(row.checkout_at as Date).toISOString(),
    due_on: String(row.due_on), status: "ACTIVE" };
}
function validId(id: string) {
  if (!id || id.includes("\0")) throw new RequestError(400, "VALIDATION_ERROR", "Invalid request.");
}
export interface LoanServiceOptions {
  timeZone?: string;
  now?: () => Date;
  /** Test-only constructor seam. Never enabled by HTTP input or runtime config. */
  afterInsert?: (client: PoolClient) => Promise<void>;
}
export class LoanService {
  constructor(private readonly pool: Pool, private readonly options: LoanServiceOptions = {}) {}

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
      const stock = await getEquipment(client, equipmentId);
      if (!stock) throw new RequestError(404, "NOT_FOUND", "Resource not found.");
      assertCheckoutAvailable(stock.quantity_total, stock.quantity_total - stock.quantity_available, record.quantity_requested);
      if (!this.options.timeZone) throw new RequestError(503, "CALENDAR_POLICY_UNCONFIGURED", "Checkout is temporarily unavailable.");
      const now = (this.options.now ?? (() => new Date()))();
      const dueOn = checkoutDueOn(now, this.options.timeZone);
      const id = randomUUID();
      await client.query(`INSERT INTO loans(id,request_id,quantity_borrowed,checked_out_by,checkout_at,due_on)
        VALUES($1,$2,$3,$4,$5,$6)`, [id, requestId, record.quantity_requested, user.id, now, dueOn]);
      await this.options.afterInsert?.(client);
      const result = await client.query(`${projection} WHERE l.id=$1`, [id]);
      const loan = view(result.rows[0]);
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

  async list(user: SessionUser): Promise<LoanView[]> {
    if (user.role !== "BORROWER") throw new RequestError(403, "FORBIDDEN", "Access denied.");
    const result = await this.pool.query(`${projection} WHERE r.borrower_id=$1 AND l.returned_at IS NULL ORDER BY l.checkout_at DESC,l.id`, [user.id]);
    return result.rows.map(view);
  }
  async get(user: SessionUser, id: string): Promise<LoanView> {
    if (user.role !== "BORROWER") throw new RequestError(403, "FORBIDDEN", "Access denied.");
    validId(id);
    const result = await this.pool.query(`${projection} WHERE l.id=$1 AND l.returned_at IS NULL`, [id]);
    if (!result.rowCount) throw new RequestError(404, "NOT_FOUND", "Resource not found.");
    if (result.rows[0].borrower_id !== user.id) throw new RequestError(403, "FORBIDDEN", "Access denied.");
    return view(result.rows[0]);
  }
}
