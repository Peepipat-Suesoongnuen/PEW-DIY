import { randomUUID } from "crypto";
import type { Pool, PoolClient } from "pg";
import { getEquipment } from "./catalog";
import type { SessionUser } from "./session";

export class RequestError extends Error {
  constructor(public readonly status: number, public readonly code: string, public readonly safeMessage: string) {
    super(code);
  }
}

/** BR-01; BR-12: check current stock without reserving it. */
export function assertRequestAvailable(available: number): void {
  if (available < 1) {
    throw new RequestError(409, "INSUFFICIENT_AVAILABILITY", "Equipment is no longer available.");
  }
}

export interface BorrowingRequestView {
  id: string;
  borrower_id: string;
  equipment_id: string;
  quantity_requested: number;
  created_at: string;
  status: "SUBMITTED" | "CHECKED_OUT";
}

export function validateRequestInput(input: unknown): { equipment_id: string; quantity_requested: number } {
  const invalid = () => new RequestError(400, "VALIDATION_ERROR", "Invalid request.");
  if (!input || typeof input !== "object" || Array.isArray(input)) throw invalid();
  const body = input as Record<string, unknown>;
  if (Object.keys(body).length !== 2 || !Object.hasOwn(body, "equipment_id") || !Object.hasOwn(body, "quantity_requested")) throw invalid();
  if (typeof body.equipment_id !== "string" || !body.equipment_id.length || body.equipment_id.includes("\0")) throw invalid();
  if (typeof body.quantity_requested !== "number" || !Number.isSafeInteger(body.quantity_requested)
    || body.quantity_requested < 1 || body.quantity_requested > 2_147_483_647) throw invalid();
  return { equipment_id: body.equipment_id, quantity_requested: body.quantity_requested };
}

type QueryDb = Pick<Pool, "query">;
async function hasLoans(db: QueryDb): Promise<boolean> {
  const result = await db.query("SELECT to_regclass('loans') AS loans");
  return result.rows[0].loans !== null;
}

function requestView(row: Record<string, unknown>): BorrowingRequestView {
  return {
    id: String(row.id), borrower_id: String(row.borrower_id), equipment_id: String(row.equipment_id),
    quantity_requested: Number(row.quantity_requested),
    created_at: new Date(row.created_at as Date).toISOString(),
    status: row.fulfilled ? "CHECKED_OUT" : "SUBMITTED",
  };
}

/** Test-only constructor seam; no HTTP route can activate a failure hook. */
export interface RequestServiceOptions { afterInsert?: (client: PoolClient) => Promise<void> }

export class BorrowingRequestService {
  constructor(private readonly pool: Pool, private readonly options: RequestServiceOptions = {}) {}

  async create(user: SessionUser, input: unknown): Promise<BorrowingRequestView> {
    if (user.role !== "BORROWER") throw new RequestError(403, "FORBIDDEN", "Access denied.");
    const body = validateRequestInput(input);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
      const equipment = await client.query("SELECT id FROM equipment WHERE id = $1 FOR UPDATE", [body.equipment_id]);
      if (!equipment.rowCount) throw new RequestError(404, "NOT_FOUND", "Resource not found.");
      const stock = await getEquipment(client, body.equipment_id);
      assertRequestAvailable(stock!.quantity_available);
      if (body.quantity_requested > stock!.quantity_available) {
        throw new RequestError(409, "INSUFFICIENT_AVAILABILITY", "Requested quantity exceeds current availability.");
      }
      const result = await client.query(
        `INSERT INTO borrowing_requests (id, borrower_id, equipment_id, quantity_requested)
         VALUES ($1, $2, $3, $4) RETURNING *, false AS fulfilled`,
        [randomUUID(), user.id, body.equipment_id, body.quantity_requested],
      );
      await this.options.afterInsert?.(client);
      await client.query("COMMIT");
      return requestView(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async list(user: SessionUser): Promise<BorrowingRequestView[]> {
    const linked = await hasLoans(this.pool);
    const fulfilled = linked ? "EXISTS (SELECT 1 FROM loans l WHERE l.request_id = r.id)" : "false";
    const predicate = user.role === "BORROWER" ? "r.borrower_id = $1" : `NOT (${fulfilled})`;
    const result = await this.pool.query(
      `SELECT r.*, ${fulfilled} AS fulfilled FROM borrowing_requests r WHERE ${predicate} ORDER BY r.created_at DESC, r.id`,
      user.role === "BORROWER" ? [user.id] : [],
    );
    return result.rows.map(requestView);
  }

  async get(user: SessionUser, id: string): Promise<BorrowingRequestView> {
    if (!id || id.includes("\0")) throw new RequestError(400, "VALIDATION_ERROR", "Invalid request.");
    const linked = await hasLoans(this.pool);
    const fulfilled = linked ? "EXISTS (SELECT 1 FROM loans l WHERE l.request_id = r.id)" : "false";
    const result = await this.pool.query(`SELECT r.*, ${fulfilled} AS fulfilled FROM borrowing_requests r WHERE r.id = $1`, [id]);
    if (!result.rowCount) throw new RequestError(404, "NOT_FOUND", "Resource not found.");
    const row = result.rows[0];
    if ((user.role === "BORROWER" && row.borrower_id !== user.id) || (user.role === "CUSTODIAN" && row.fulfilled)) {
      throw new RequestError(403, "FORBIDDEN", "Access denied.");
    }
    return requestView(row);
  }
}
