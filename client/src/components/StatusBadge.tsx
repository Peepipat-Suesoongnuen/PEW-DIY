import type { CatalogStatus, LoanStatus, RequestStatus } from "../lib/api";

const requestTone: Record<RequestStatus, { label: string; style: string }> = {
  SUBMITTED: { label: "Submitted", style: "bg-warning/10 text-warning" },
  PENDING: { label: "Pending approval", style: "bg-warning/10 text-warning" },
  APPROVED: { label: "Approved", style: "bg-primary/10 text-primary" },
  REJECTED: { label: "Rejected", style: "bg-danger/10 text-danger" },
  CANCELLED: { label: "Cancelled", style: "bg-border/60 text-text-muted" },
  CHECKED_OUT: { label: "Checked out", style: "bg-success/10 text-success" },
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const cfg = requestTone[status] ?? { label: status, style: "bg-border/60 text-text-muted" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.style}`}>
      {cfg.label}
    </span>
  );
}

const loanTone: Record<LoanStatus, { label: string; style: string }> = {
  ACTIVE: { label: "Active", style: "bg-primary/10 text-primary" },
  RETURN_PENDING: { label: "Return pending", style: "bg-warning/10 text-warning" },
  RETURNED: { label: "Returned", style: "bg-success/10 text-success" },
};

export function LoanStatusBadge({ status, overdue = false }: { status: LoanStatus; overdue?: boolean }) {
  if (overdue && status !== "RETURNED") {
    return (
      <span className="inline-flex items-center rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-medium text-danger">
        Overdue{status === "RETURN_PENDING" ? " · Return pending" : ""}
      </span>
    );
  }
  const cfg = loanTone[status] ?? { label: status, style: "bg-border/60 text-text-muted" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.style}`}>
      {cfg.label}
    </span>
  );
}

export function CatalogStatusBadge({ status }: { status: CatalogStatus }) {
  const active = status === "ACTIVE";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active ? "bg-success/10 text-success" : "bg-border/60 text-text-muted"
      }`}
    >
      {active ? "Active" : "Retired"}
    </span>
  );
}
