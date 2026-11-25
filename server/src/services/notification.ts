/**
 * In-app notifications service (F-07, BR-13):
 * - Approval / Rejection notifications created on decision.
 * - Due-soon (<= 2 calendar days) and Overdue notifications synced idempotently.
 * - Users can mark read (dismiss) or clear all notifications persistently.
 */
import { randomUUID } from "crypto";
import type { Pool } from "pg";
import { RequestError } from "./borrowing-request";
import { businessDateInZone } from "./loan";
import type { SessionUser } from "./session";

export interface NotificationView {
  id: string;
  kind: string;
  reference_id: string;
  title: string;
  message: string;
  created_at: string;
}

function diffCalendarDays(dueOn: string, today: string): number {
  const a = Date.parse(`${dueOn}T00:00:00Z`);
  const b = Date.parse(`${today}T00:00:00Z`);
  return Math.round((a - b) / 86_400_000);
}

export class NotificationService {
  constructor(
    private readonly pool: Pool,
    private readonly options: { timeZone?: string; now?: () => Date } = {},
  ) {}

  private businessToday(): string {
    const tz = this.options.timeZone || "Asia/Bangkok";
    const now = (this.options.now ?? (() => new Date()))();
    return businessDateInZone(now, tz);
  }

  async syncLoanAlerts(userId: string): Promise<void> {
    const today = this.businessToday();
    const res = await this.pool.query(
      `SELECT l.id, l.due_on::text AS due_on, e.name AS equipment_name
       FROM loans l
       JOIN borrowing_requests r ON r.id = l.request_id
       JOIN equipment e ON e.id = r.equipment_id
       WHERE r.borrower_id = $1 AND l.returned_at IS NULL`,
      [userId],
    );
    for (const row of res.rows) {
      const dueOn = String(row.due_on);
      const diff = diffCalendarDays(dueOn, today);
      if (diff < 0) {
        await this.pool.query(
          `INSERT INTO notifications (id, user_id, kind, reference_id, title, message)
           VALUES ($1, $2, 'LOAN_OVERDUE', $3, $4, $5)
           ON CONFLICT (user_id, kind, reference_id) DO NOTHING`,
          [
            randomUUID(),
            userId,
            String(row.id),
            "Loan overdue",
            `${String(row.equipment_name)} was due on ${dueOn} and is overdue.`,
          ],
        );
      } else if (diff <= 2) {
        await this.pool.query(
          `INSERT INTO notifications (id, user_id, kind, reference_id, title, message)
           VALUES ($1, $2, 'LOAN_DUE_SOON', $3, $4, $5)
           ON CONFLICT (user_id, kind, reference_id) DO NOTHING`,
          [
            randomUUID(),
            userId,
            String(row.id),
            "Return due soon",
            `${String(row.equipment_name)} is due on ${dueOn} (${diff === 0 ? "today" : `in ${diff} day(s)`}).`,
          ],
        );
      }
    }
  }

  async list(user: SessionUser): Promise<NotificationView[]> {
    if (user.role === "BORROWER") {
      await this.syncLoanAlerts(user.id);
    }
    const res = await this.pool.query(
      `SELECT id, kind, reference_id, title, message, created_at
       FROM notifications
       WHERE user_id = $1 AND read_at IS NULL AND cleared_at IS NULL
       ORDER BY created_at DESC, id`,
      [user.id],
    );
    return res.rows.map((r) => ({
      id: String(r.id),
      kind: String(r.kind),
      reference_id: String(r.reference_id),
      title: String(r.title),
      message: String(r.message),
      created_at: new Date(r.created_at as Date).toISOString(),
    }));
  }

  async markRead(user: SessionUser, id: string): Promise<{ id: string; read_at: string }> {
    if (!id || id.includes("\0")) throw new RequestError(400, "VALIDATION_ERROR", "Invalid notification id.");
    const found = await this.pool.query(`SELECT id, user_id FROM notifications WHERE id = $1`, [id]);
    if (!found.rowCount) throw new RequestError(404, "NOT_FOUND", "Notification not found.");
    if (found.rows[0].user_id !== user.id) throw new RequestError(403, "FORBIDDEN", "Access denied.");
    const res = await this.pool.query(
      `UPDATE notifications SET read_at = COALESCE(read_at, now()) WHERE id = $1 RETURNING id, read_at`,
      [id],
    );
    return { id: String(res.rows[0].id), read_at: new Date(res.rows[0].read_at as Date).toISOString() };
  }

  async clearAll(user: SessionUser): Promise<void> {
    await this.pool.query(
      `UPDATE notifications SET cleared_at = COALESCE(cleared_at, now()) WHERE user_id = $1 AND cleared_at IS NULL`,
      [user.id],
    );
  }
}
