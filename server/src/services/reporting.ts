/**
 * Inventory Reporting service (Sprint 3 F-09, FR-20):
 * Read-only aggregates over persisted equipment, borrowing_requests, and loans.
 */
import type { Pool } from "pg";
import { listEquipment, type EquipmentView } from "./catalog";
import { businessDateInZone, isLoanOverdue } from "./loan";

export interface ReportItemSummary extends EquipmentView {
  held_units: number;
}

export interface OverdueLoanSummary {
  loan_id: string;
  equipment_id: string;
  equipment_name: string;
  borrower_username: string;
  quantity_borrowed: number;
  due_on: string;
  days_overdue: number;
}

export interface InventoryReportSummary {
  generated_at: string;
  business_date: string;
  inventory: {
    total_items: number;
    active_items: number;
    retired_items: number;
    total_units: number;
    held_units: number;
    available_units: number;
    unavailable_active_items: number;
  };
  requests: {
    pending_count: number;
    approved_count: number;
    rejected_count: number;
    cancelled_count: number;
    checked_out_count: number;
  };
  loans: {
    active_count: number;
    return_pending_count: number;
    returned_count: number;
    overdue_count: number;
  };
  items: ReportItemSummary[];
  overdue_loans: OverdueLoanSummary[];
}

function diffDays(today: string, dueOn: string): number {
  return Math.max(0, Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${dueOn}T00:00:00Z`)) / 86_400_000));
}

export class ReportingService {
  constructor(
    private readonly pool: Pool,
    private readonly options: { timeZone?: string; now?: () => Date } = {},
  ) {}

  async getSummary(): Promise<InventoryReportSummary> {
    const tz = this.options.timeZone || "Asia/Bangkok";
    const now = (this.options.now ?? (() => new Date()))();
    const today = businessDateInZone(now, tz);

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");

      const rawItems = await listEquipment(client, { status: "ALL", sort: "name_asc" });
      let active_items = 0;
      let retired_items = 0;
      let total_units = 0;
      let available_units = 0;
      let unavailable_active_items = 0;
      const items: ReportItemSummary[] = rawItems.map((item) => {
        if (item.catalog_status === "ACTIVE") {
          active_items++;
          if (item.quantity_available === 0) unavailable_active_items++;
        } else {
          retired_items++;
        }
        total_units += item.quantity_total;
        available_units += item.quantity_available;
        return {
          ...item,
          held_units: item.quantity_total - item.quantity_available,
        };
      });
      const held_units = total_units - available_units;

      const reqRows = await client.query(
        `SELECT r.approval_status, EXISTS (SELECT 1 FROM loans l WHERE l.request_id = r.id) AS fulfilled
         FROM borrowing_requests r`,
      );
      const requests = {
        pending_count: 0,
        approved_count: 0,
        rejected_count: 0,
        cancelled_count: 0,
        checked_out_count: 0,
      };
      for (const r of reqRows.rows) {
        if (r.fulfilled) requests.checked_out_count++;
        else if (r.approval_status === "PENDING") requests.pending_count++;
        else if (r.approval_status === "APPROVED") requests.approved_count++;
        else if (r.approval_status === "REJECTED") requests.rejected_count++;
        else if (r.approval_status === "CANCELLED") requests.cancelled_count++;
      }

      const loanRows = await client.query(
        `SELECT l.id, r.equipment_id, e.name AS equipment_name, u.username AS borrower_username,
                l.quantity_borrowed, l.due_on::text AS due_on, l.return_requested_at, l.returned_at
         FROM loans l
         JOIN borrowing_requests r ON r.id = l.request_id
         JOIN equipment e ON e.id = r.equipment_id
         JOIN users u ON u.id = r.borrower_id
         ORDER BY l.due_on ASC, l.id`,
      );

      const loans = {
        active_count: 0,
        return_pending_count: 0,
        returned_count: 0,
        overdue_count: 0,
      };
      const overdue_loans: OverdueLoanSummary[] = [];

      for (const row of loanRows.rows) {
        const returnedAt = row.returned_at ? new Date(row.returned_at as Date).toISOString() : null;
        const dueOn = String(row.due_on);
        if (returnedAt !== null) {
          loans.returned_count++;
        } else {
          if (row.return_requested_at !== null) {
            loans.return_pending_count++;
          } else {
            loans.active_count++;
          }
          if (isLoanOverdue(dueOn, returnedAt, today)) {
            loans.overdue_count++;
            overdue_loans.push({
              loan_id: String(row.id),
              equipment_id: String(row.equipment_id),
              equipment_name: String(row.equipment_name),
              borrower_username: String(row.borrower_username),
              quantity_borrowed: Number(row.quantity_borrowed),
              due_on: dueOn,
              days_overdue: diffDays(today, dueOn),
            });
          }
        }
      }

      await client.query("COMMIT");

      return {
        generated_at: now.toISOString(),
        business_date: today,
        inventory: {
          total_items: items.length,
          active_items,
          retired_items,
          total_units,
          held_units,
          available_units,
          unavailable_active_items,
        },
        requests,
        loans,
        items,
        overdue_loans,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
