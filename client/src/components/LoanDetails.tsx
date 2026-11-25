import type { Loan } from "../lib/api";
import { shortRef } from "../lib/format";
import { LoanStatusBadge } from "./StatusBadge";

interface LoanDetailsProps {
  loan: Loan;
  borrowerName?: string;
  equipmentName?: string;
  bundleLoans?: Loan[];
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
export function LoanDetails({ loan, borrowerName, equipmentName, bundleLoans }: LoanDetailsProps) {
  const showBundle = Boolean(bundleLoans && bundleLoans.length > 1);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailBox
          label="Loan ID"
          value={
            <span className="inline-flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">{shortRef(loan.id)}</span>
              <span>{loan.id}</span>
            </span>
          }
        />
        <DetailBox label="Status" value={<LoanStatusBadge status={loan.status} overdue={loan.overdue} />} />
        {!showBundle ? (
          <>
            <DetailBox label="Equipment" value={equipmentName ?? loan.equipment_name ?? "Equipment details unavailable"} />
            <DetailBox label="Quantity" value={loan.quantity_borrowed} />
          </>
        ) : null}
        <DetailBox label="Borrower" value={borrowerName ?? loan.borrower_username ?? loan.borrower_id} />
        <DetailBox label="Checked out by" value={loan.checked_out_by_username ?? loan.checked_out_by} />
        <DetailBox label="Due date" value={loan.due_on} />
        <DetailBox label="Checked out" value={formatBangkok(loan.checkout_at)} />
        {loan.bundle_id ? (
          <DetailBox
            label="Bundle ID"
            value={
              <span className="inline-flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
                  {shortRef(loan.bundle_id)}
                </span>
                <span>{loan.bundle_id}</span>
              </span>
            }
          />
        ) : null}
        {loan.return_requested_at ? (
          <DetailBox label="Return requested" value={formatBangkok(loan.return_requested_at)} />
        ) : null}
        {loan.returned_at ? <DetailBox label="Returned" value={formatBangkok(loan.returned_at)} /> : null}
      </div>

      {showBundle && bundleLoans ? (
        <div className="rounded-control border border-border bg-white p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Bundle items</p>
          <table className="w-full table-fixed text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-text-muted">
                <th className="w-[52%] py-1.5 pr-3 font-medium">Equipment</th>
                <th className="w-[18%] py-1.5 pr-3 font-medium">Qty</th>
                <th className="w-[30%] py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bundleLoans.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 pr-3 font-medium text-text">{item.equipment_name ?? item.equipment_id}</td>
                  <td className="py-2 pr-3 text-text">{item.quantity_borrowed}</td>
                  <td className="py-2">
                    <LoanStatusBadge status={item.status} overdue={item.overdue} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {loan.return_note ? (
        <div className="rounded-control border border-border bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Return note</p>
          <p className="mt-1 text-sm text-text">{loan.return_note}</p>
        </div>
      ) : null}
    </div>
  );
}
