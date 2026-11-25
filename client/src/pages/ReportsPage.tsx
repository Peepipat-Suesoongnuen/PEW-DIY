import { useCallback, useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Link } from "react-router-dom";
import { api, ApiError, type InventoryReportSummary } from "../lib/api";
import { loanPath } from "../lib/paths";
import { useSession, useUnauthorizedRedirect } from "../lib/session";
import { Alert } from "../components/Alert";
import { AvailabilityBadge } from "../components/AvailabilityBadge";
import { BackButton } from "../components/BackButton";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Loading } from "../components/Loading";
import { Pagination, usePagination } from "../components/Pagination";
import { CatalogStatusBadge } from "../components/StatusBadge";
import { Table, Th } from "../components/Table";

function MetricBox({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="rounded-card border border-border bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-primary">{value}</p>
      {note ? <p className="mt-1 text-xs text-text-muted">{note}</p> : null}
    </div>
  );
}

/**
 * Sprint 3 F-09 Custodian Inventory & Overdue Report Page.
 */
export function ReportsPage() {
  const { user } = useSession();
  const onUnauthorized = useUnauthorizedRedirect();

  const [report, setReport] = useState<InventoryReportSummary | null>(null);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const overduePagination = usePagination(report?.overdue_loans ?? [], 10);
  const itemsPagination = usePagination(report?.items ?? [], 10);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.getReportSummary();
      setReport(res.data);
    } catch (cause) {
      if (onUnauthorized(cause)) return;
      setError({
        message: "Could not load inventory report right now.",
        requestId: cause instanceof ApiError ? cause.requestId : undefined,
      });
    }
  }, [onUnauthorized]);

  useEffect(() => {
    if (user?.role === "CUSTODIAN") {
      void load();
    }
  }, [load, user?.role]);

  if (user?.role !== "CUSTODIAN") {
    return (
      <div className="space-y-4">
        <BackButton to="/catalog" label="Back to catalog" />
        <Alert tone="danger">Only Custodian accounts can view inventory reports.</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <BackButton to="/catalog" label="Back to catalog" />
        {report ? (
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer aria-hidden="true" className="h-4 w-4" />
            <span>Print report</span>
          </Button>
        ) : null}
      </div>

      <div>
        <h1 className="text-xl font-semibold text-text">Inventory &amp; Loan Report</h1>
        {report ? (
          <p className="mt-0.5 text-sm text-text-muted">
            Business date: {report.business_date} (Asia/Bangkok) · Generated{" "}
            {new Date(report.generated_at).toLocaleString("en-GB", { timeZone: "Asia/Bangkok" })}
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="space-y-4">
          <Alert tone="danger" requestId={error.requestId}>
            {error.message}
          </Alert>
          <Button variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : !report ? (
        <Loading label="Generating inventory report…" />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricBox
              label="Total catalog items"
              value={report.inventory.total_items}
              note={`${report.inventory.active_items} active · ${report.inventory.retired_items} retired`}
            />
            <MetricBox
              label="Total units"
              value={report.inventory.total_units}
              note={`${report.inventory.available_units} available · ${report.inventory.held_units} held`}
            />
            <MetricBox
              label="Pending / Approved requests"
              value={report.requests.pending_count + report.requests.approved_count}
              note={`${report.requests.pending_count} pending · ${report.requests.approved_count} approved`}
            />
            <MetricBox
              label="Overdue loans"
              value={report.loans.overdue_count}
              note={`${report.loans.active_count} active · ${report.loans.return_pending_count} return pending`}
            />
          </div>

          <Card title="Overdue loans">
            {report.overdue_loans.length === 0 ? (
              <p className="text-sm text-text-muted">No overdue loans as of {report.business_date}.</p>
            ) : (
              <div className="space-y-3">
                <Table
                  header={
                    <tr>
                      <Th className="w-[22%]">Borrower</Th>
                      <Th className="w-[34%]">Equipment</Th>
                      <Th className="w-[10%]">Qty</Th>
                      <Th className="w-[18%]">Due date</Th>
                      <Th className="w-[16%]">Days overdue</Th>
                    </tr>
                  }
                >
                  {overduePagination.pageItems.map((ov) => (
                    <tr key={ov.loan_id}>
                      <td className="truncate px-4 py-3 font-medium text-text">{ov.borrower_username}</td>
                      <td className="truncate px-4 py-3">
                        <Link to={loanPath(ov.loan_id)} className="text-primary hover:underline">
                          {ov.equipment_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-text">{ov.quantity_borrowed}</td>
                      <td className="px-4 py-3 tabular-nums text-text">{ov.due_on}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-danger">{ov.days_overdue}</td>
                    </tr>
                  ))}
                </Table>
                <Pagination
                  page={overduePagination.page}
                  pageSize={overduePagination.pageSize}
                  totalItems={overduePagination.totalItems}
                  totalPages={overduePagination.totalPages}
                  onPageChange={overduePagination.setPage}
                  onPageSizeChange={overduePagination.setPageSize}
                />
              </div>
            )}
          </Card>

          <Card title="Catalog stock breakdown">
            <div className="space-y-3">
              <Table
                header={
                  <tr>
                    <Th className="w-[32%]">Equipment</Th>
                    <Th className="w-[20%]">Category</Th>
                    <Th className="w-[14%]">Status</Th>
                    <Th className="w-[16%]">Available / Total</Th>
                    <Th className="w-[18%]">Availability</Th>
                  </tr>
                }
              >
                {itemsPagination.pageItems.map((eq) => (
                  <tr key={eq.id}>
                    <td className="truncate px-4 py-3 font-medium text-text">{eq.name}</td>
                    <td className="truncate px-4 py-3 text-text-muted">{eq.category}</td>
                    <td className="px-4 py-3">
                      <CatalogStatusBadge status={eq.catalog_status ?? "ACTIVE"} />
                    </td>
                    <td className="px-4 py-3 tabular-nums text-text">
                      {eq.quantity_available} / {eq.quantity_total}
                    </td>
                    <td className="px-4 py-3">
                      <AvailabilityBadge availability={eq.availability} />
                    </td>
                  </tr>
                ))}
              </Table>
              <Pagination
                page={itemsPagination.page}
                pageSize={itemsPagination.pageSize}
                totalItems={itemsPagination.totalItems}
                totalPages={itemsPagination.totalPages}
                onPageChange={itemsPagination.setPage}
                onPageSizeChange={itemsPagination.setPageSize}
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
