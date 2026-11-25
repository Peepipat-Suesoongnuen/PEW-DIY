import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, Plus, Search } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  api,
  ApiError,
  PURPOSE_CATEGORIES,
  type BorrowingRequest,
  type PurposeCategory,
  type RequestStatus,
} from "../lib/api";
import { loanPath, newRequestPath, requestIdFromPathname, requestPath } from "../lib/paths";
import { useSession, useUnauthorizedRedirect } from "../lib/session";
import { Alert } from "../components/Alert";
import { BackButton } from "../components/BackButton";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CheckoutRequest } from "../components/CheckoutRequest";
import { EmptyState } from "../components/EmptyState";
import { Loading } from "../components/Loading";
import { RequestStatusBadge } from "../components/StatusBadge";
import { Table, Th } from "../components/Table";

function purposeLabel(cat?: PurposeCategory): string {
  if (!cat) return "Other";
  return PURPOSE_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

function formatBangkok(iso: string | null | undefined): string {
  if (!iso) return "—";
  return `${new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Bangkok" })} (Asia/Bangkok)`;
}

function DetailBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-control border border-border bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <div className="mt-1 text-sm text-text">{children}</div>
    </div>
  );
}

export function RequestsPage() {
  const { user } = useSession();
  const { pathname, state } = useLocation();
  const navigate = useNavigate();
  const onUnauthorized = useUnauthorizedRedirect();

  const detailId = requestIdFromPathname(pathname);
  const isCustodian = user?.role === "CUSTODIAN";
  const pageTitle = isCustodian ? "Submitted requests" : "My requests";
  const submitted = Boolean((state as { submitted?: boolean } | null)?.submitted);

  const [items, setItems] = useState<BorrowingRequest[] | null>(null);
  const [detail, setDetail] = useState<BorrowingRequest | null>(null);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | RequestStatus>("");

  // Decision / Cancel controls on detail
  const [decisionNote, setDecisionNote] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const load = useCallback(async () => {
    setError(null);
    setNotFound(false);
    try {
      const listRes = await api.listRequests();
      setItems(Array.isArray(listRes.data) ? listRes.data : []);
      if (detailId) {
        try {
          const single = await api.getRequest(detailId);
          setDetail(single.data);
        } catch (cause) {
          if (onUnauthorized(cause)) return;
          if (cause instanceof ApiError && cause.status === 404) {
            setNotFound(true);
            setDetail(null);
            return;
          }
          if (cause instanceof ApiError && cause.status === 403) {
            setError({ message: "You do not have access to this request.", requestId: cause.requestId });
            setDetail(null);
            return;
          }
          throw cause;
        }
      } else {
        setDetail(null);
      }
    } catch (cause) {
      if (onUnauthorized(cause)) return;
      setError({
        message: "We could not load borrowing requests right now. Please try again.",
        requestId: cause instanceof ApiError ? cause.requestId : undefined,
      });
    }
  }, [detailId, onUnauthorized]);

  useEffect(() => {
    setDecisionNote("");
    setActionError(null);
    void load();
  }, [load]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    return items.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.id.toLowerCase().includes(q) ||
        (r.equipment_name ?? "").toLowerCase().includes(q) ||
        (r.borrower_username ?? "").toLowerCase().includes(q) ||
        (r.purpose_detail ?? "").toLowerCase().includes(q) ||
        purposeLabel(r.purpose_category).toLowerCase().includes(q)
      );
    });
  }, [items, search, statusFilter]);

  const bundleSiblings = useMemo(() => {
    if (!detail?.bundle_id || !items) return [];
    return items.filter((r) => r.bundle_id === detail.bundle_id);
  }, [detail, items]);

  const bundleApprovedCount = useMemo(
    () => bundleSiblings.filter((r) => r.status === "APPROVED").length,
    [bundleSiblings],
  );

  async function runAction(fn: () => Promise<unknown>) {
    setActionBusy(true);
    setActionError(null);
    try {
      await fn();
      await load();
    } catch (cause) {
      if (onUnauthorized(cause)) return;
      setActionError(cause instanceof ApiError ? cause.message : "Could not complete request action.");
    } finally {
      setActionBusy(false);
    }
  }

  if (detailId) {
    return (
      <div className="space-y-6">
        <BackButton to="/requests" label={`Back to ${pageTitle}`} />

        {notFound ? (
          <Card title="Request not found">
            <p className="text-sm text-text-muted">This borrowing request could not be found.</p>
          </Card>
        ) : error ? (
          <div className="space-y-4">
            <Alert tone="danger" requestId={error.requestId}>
              {error.message}
            </Alert>
            <Button variant="secondary" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        ) : !detail ? (
          <Loading label="Loading request details…" />
        ) : (
          <div className="space-y-6">
            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-xl font-semibold text-text">Request details</h1>
                <RequestStatusBadge status={detail.status} />
              </div>

              {actionError ? (
                <div className="mb-4">
                  <Alert tone="danger">{actionError}</Alert>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailBox label="Request ID">
                  <span className="font-mono text-xs">{detail.id}</span>
                </DetailBox>
                <DetailBox label="Equipment">{detail.equipment_name ?? detail.equipment_id}</DetailBox>
                <DetailBox label="Quantity requested">{detail.quantity_requested}</DetailBox>
                <DetailBox label="Requested duration">{detail.requested_days ?? 7} calendar day(s)</DetailBox>
                <DetailBox label="Purpose category">{purposeLabel(detail.purpose_category)}</DetailBox>
                <DetailBox label="Borrower">{detail.borrower_username ?? detail.borrower_id}</DetailBox>
                <div className="sm:col-span-2">
                  <DetailBox label="Purpose details">{detail.purpose_detail || "—"}</DetailBox>
                </div>
                <DetailBox label="Submitted at">{formatBangkok(detail.created_at)}</DetailBox>
                {detail.bundle_id ? (
                  <DetailBox label="Bundle ID">
                    <span className="font-mono text-xs">{detail.bundle_id}</span>
                  </DetailBox>
                ) : null}
                {detail.reviewed_at ? (
                  <DetailBox label="Reviewed at">{formatBangkok(detail.reviewed_at)}</DetailBox>
                ) : null}
                {detail.decision_note ? (
                  <div className="sm:col-span-2">
                    <DetailBox label="Custodian decision note">{detail.decision_note}</DetailBox>
                  </div>
                ) : null}
              </div>

              {!isCustodian && (detail.status === "PENDING" || detail.status === "APPROVED") ? (
                <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button
                    variant="secondary"
                    disabled={actionBusy}
                    onClick={() => void runAction(() => api.cancelRequest(detail.id))}
                  >
                    Cancel request
                  </Button>
                  {detail.bundle_id && bundleSiblings.some((s) => s.id !== detail.id && (s.status === "PENDING" || s.status === "APPROVED")) ? (
                    <Button
                      variant="secondary"
                      disabled={actionBusy}
                      onClick={() => void runAction(() => api.cancelBundle(detail.bundle_id!))}
                    >
                      Cancel entire bundle
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {isCustodian && detail.status === "PENDING" ? (
                <div className="mt-6 space-y-3 border-t border-border pt-4">
                  <div>
                    <label htmlFor="decision-note" className="mb-1 block text-sm font-medium text-text">
                      Decision note (optional)
                    </label>
                    <input
                      id="decision-note"
                      type="text"
                      maxLength={500}
                      value={decisionNote}
                      onChange={(e) => setDecisionNote(e.target.value)}
                      placeholder="Optional note for borrower…"
                      disabled={actionBusy}
                      className="h-10 w-full max-w-lg rounded-control border border-border bg-white px-3 text-sm text-text"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={actionBusy}
                      loading={actionBusy}
                      onClick={() => void runAction(() => api.approveRequest(detail.id, decisionNote.trim()))}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={actionBusy}
                      onClick={() => void runAction(() => api.rejectRequest(detail.id, decisionNote.trim()))}
                    >
                      Reject
                    </Button>
                    {detail.bundle_id && bundleSiblings.filter((s) => s.status === "PENDING").length > 1 ? (
                      <>
                        <Button
                          variant="secondary"
                          disabled={actionBusy}
                          onClick={() =>
                            void runAction(() => api.approveBundle(detail.bundle_id!, decisionNote.trim()))
                          }
                        >
                          Approve entire bundle
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={actionBusy}
                          onClick={() =>
                            void runAction(() => api.rejectBundle(detail.bundle_id!, decisionNote.trim()))
                          }
                        >
                          Reject entire bundle
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {isCustodian && detail.status === "APPROVED" ? (
                <div className="mt-4 border-t border-border pt-4">
                  <CheckoutRequest
                    key={`${detail.id}-${refreshTick}`}
                    requestId={detail.id}
                    bundleId={detail.bundle_id}
                    bundleApprovedCount={bundleApprovedCount}
                    onSuccess={(loan) => navigate(loanPath(loan.id), { state: { checkedOut: true } })}
                    onBundleSuccess={() => navigate("/loans", { state: { checkedOut: true } })}
                    onRefresh={() => {
                      setRefreshTick((t) => t + 1);
                      void load();
                    }}
                  />
                </div>
              ) : null}
            </Card>

            {bundleSiblings.length > 1 ? (
              <Card title="Items in this bundle">
                <Table
                  header={
                    <tr>
                      <Th>Equipment</Th>
                      <Th>Qty</Th>
                      <Th>Status</Th>
                      <Th className="w-10">
                        <span className="sr-only">Open</span>
                      </Th>
                    </tr>
                  }
                >
                  {bundleSiblings.map((sib) => (
                    <tr
                      key={sib.id}
                      onClick={() => navigate(requestPath(sib.id))}
                      className="cursor-pointer transition-colors hover:bg-primary/5"
                    >
                      <td className="px-4 py-3 font-medium text-text">
                        {sib.equipment_name ?? sib.equipment_id}
                      </td>
                      <td className="px-4 py-3 text-text">{sib.quantity_requested}</td>
                      <td className="px-4 py-3">
                        <RequestStatusBadge status={sib.status} />
                      </td>
                      <td className="px-4 py-3 text-right text-text-muted">
                        <ChevronRight aria-hidden="true" className="ml-auto h-4 w-4" />
                      </td>
                    </tr>
                  ))}
                </Table>
              </Card>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">{pageTitle}</h1>
          <p className="mt-0.5 text-sm text-text-muted">
            Select any request row to inspect full details and take action.
          </p>
        </div>
        {!isCustodian ? (
          <Link
            to={newRequestPath()}
            className="inline-flex items-center gap-2 rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            <span>Create request</span>
          </Link>
        ) : null}
      </div>

      {submitted ? (
        <Alert tone="success">
          Your borrowing request was submitted and is waiting for custodian approval.
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-3 rounded-card border border-border bg-white p-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="requests-search" className="mb-1 block text-xs font-medium text-text-muted">
            Search requests
          </label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-text-muted" />
            <input
              id="requests-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by equipment, borrower, purpose, or request ID…"
              className="h-10 w-full rounded-control border border-border bg-white pl-9 pr-3 text-sm text-text"
            />
          </div>
        </div>
        <div>
          <label htmlFor="requests-status-filter" className="mb-1 block text-xs font-medium text-text-muted">
            Status
          </label>
          <select
            id="requests-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "" | RequestStatus)}
            className="h-10 w-full rounded-control border border-border bg-white px-3 text-sm text-text"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="CHECKED_OUT">Checked out</option>
          </select>
        </div>
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
      ) : items === null ? (
        <Loading label={`Loading ${pageTitle.toLowerCase()}…`} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          message={
            search || statusFilter
              ? "No requests matched your filters."
              : isCustodian
                ? "No submitted requests."
                : "No requests yet."
          }
          action={
            !isCustodian && !search && !statusFilter ? (
              <Link
                to={newRequestPath()}
                className="rounded-control border border-border px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5"
              >
                Create your first request
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Table
              header={
                <tr>
                  <Th>Equipment</Th>
                  <Th>Qty</Th>
                  <Th>Duration</Th>
                  <Th className="hidden lg:table-cell">Purpose</Th>
                  {isCustodian ? <Th>Borrower</Th> : null}
                  <Th>Status</Th>
                  <Th className="hidden lg:table-cell">Submitted</Th>
                  <Th className="w-10">
                    <span className="sr-only">Open</span>
                  </Th>
                </tr>
              }
            >
              {filteredItems.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigate(requestPath(r.id))}
                  title="Click row to open request details"
                  className="cursor-pointer transition-colors hover:bg-primary/5"
                >
                  <td className="px-4 py-3 font-medium text-text">
                    <Link
                      to={requestPath(r.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary hover:underline"
                    >
                      {r.equipment_name ?? r.equipment_id}
                    </Link>
                    {r.bundle_id ? (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Bundle
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-text">{r.quantity_requested}</td>
                  <td className="px-4 py-3 text-text">{r.requested_days ?? 7}d</td>
                  <td className="hidden px-4 py-3 text-text-muted lg:table-cell">
                    {purposeLabel(r.purpose_category)}
                  </td>
                  {isCustodian ? (
                    <td className="px-4 py-3 text-text">{r.borrower_username ?? r.borrower_id}</td>
                  ) : null}
                  <td className="px-4 py-3">
                    <RequestStatusBadge status={r.status} />
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-text-muted lg:table-cell">
                    {new Date(r.created_at).toLocaleDateString("en-GB", { timeZone: "Asia/Bangkok" })}
                  </td>
                  <td className="px-4 py-3 text-right text-text-muted">
                    <ChevronRight aria-hidden="true" className="ml-auto h-4 w-4" />
                  </td>
                </tr>
              ))}
            </Table>
          </div>

          <ul className="space-y-3 md:hidden">
            {filteredItems.map((r) => (
              <li key={r.id}>
                <Link
                  to={requestPath(r.id)}
                  className="block rounded-card border border-border bg-white p-4 hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-text">{r.equipment_name ?? r.equipment_id}</span>
                    <RequestStatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-sm text-text-muted">
                    Qty {r.quantity_requested} · {r.requested_days ?? 7}d · {purposeLabel(r.purpose_category)}
                  </p>
                  {isCustodian ? (
                    <p className="mt-1 text-xs text-text-muted">
                      Borrower: {r.borrower_username ?? r.borrower_id}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
