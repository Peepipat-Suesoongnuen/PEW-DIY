import type { Loan } from "../lib/api";
import { LoanStatusBadge } from "./StatusBadge";

interface LoanDetailsProps {
  loan: Loan;
  borrowerName?: string;
  equipmentName?: string;
}

function formatBangkok(iso: string | null | undefined): string {
  if (!iso) return "—";
  return `${new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Bangkok" })} (Asia/Bangkok)`;
}

function DetailBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-control border border-border bg-white p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <div className="mt-1 text-sm font-medium text-text">{value}</div>
    </div>
  );
}

/**
 * Structured Loan detail view (clear separated labeled boxes for instant scanning
 * and print-friendly Loan Slip support).
 */
export function LoanDetails({ loan, borrowerName, equipmentName }: LoanDetailsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailBox label="Loan ID" value={<span className="font-mono text-xs">{loan.id}</span>} />
        <DetailBox label="Status" value={<LoanStatusBadge status={loan.status} overdue={loan.overdue} />} />
        <DetailBox label="Equipment" value={equipmentName ?? loan.equipment_name ?? "Equipment details unavailable"} />
        <DetailBox label="Quantity" value={loan.quantity_borrowed} />
        <DetailBox label="Borrower" value={borrowerName ?? loan.borrower_username ?? loan.borrower_id} />
        <DetailBox label="Due date" value={loan.due_on} />
        <DetailBox label="Checked out" value={formatBangkok(loan.checkout_at)} />
        {loan.bundle_id ? (
          <DetailBox label="Bundle ID" value={<span className="font-mono text-xs">{loan.bundle_id}</span>} />
        ) : null}
        {loan.return_requested_at ? (
          <DetailBox label="Return requested" value={formatBangkok(loan.return_requested_at)} />
        ) : null}
        {loan.returned_at ? <DetailBox label="Returned" value={formatBangkok(loan.returned_at)} /> : null}
      </div>
      {loan.return_note ? (
        <div className="rounded-control border border-border bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Return note</p>
          <p className="mt-1 text-sm text-text">{loan.return_note}</p>
        </div>
      ) : null}
    </div>
  );
}
