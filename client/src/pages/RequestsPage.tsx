import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronDown, ChevronRight, Copy, Plus, Search } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  api,
  ApiError,
  PURPOSE_CATEGORIES,
  type BorrowingRequest,
  type PurposeCategory,
  type RequestStatus,
} from "../lib/api";
import { groupByBundle, matchesRefOrText, shortRef } from "../lib/format";
import { loanPath, newRequestPath, requestIdFromPathname, requestPath } from "../lib/paths";
import { useSession, useUnauthorizedRedirect } from "../lib/session";
import { Alert } from "../components/Alert";
import { BackButton } from "../components/BackButton";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CheckoutRequest } from "../components/CheckoutRequest";
import { EmptyState } from "../components/EmptyState";
import { Loading } from "../components/Loading";
import { Pagination, usePagination } from "../components/Pagination";
import { RequestStatusBadge } from "../components/StatusBadge";
import { Table, Th } from "../components/Table";

type RequestSortField = "submitted" | "qty" | "duration" | "purpose";
type SortDir = "asc" | "desc";

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

function SortHeaderButton({
  label,
  field,
  activeField,
  dir,
  onToggle,
}: {
  label: string;
  field: RequestSortField;
  activeField: RequestSortField;
  dir: SortDir;
  onToggle: (field: RequestSortField) => void;
}) {
  const active = activeField === field;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onToggle(field)}
      className="inline-flex items-center gap-1 font-medium text-text-muted hover:text-primary"
    >
      <span>{label}</span>
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
    </button>
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

  // Filters & sorting
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | RequestStatus>("");
  const [sortField, setSortField] = useState<RequestSortField>("submitted");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedBundles, setExpandedBundles] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Decision / Cancel controls on detail
  const [decisionNote, setDecisionNote] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const loadSeqRef = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    setError(null);
    setNotFound(false);
    if (!detailId) {
      setDetail(null);
    }
    try {
      if (detailId) {
        const listPromise = api.listRequests();
        try {
          const single = await api.getRequest(detailId);
          if (seq !== loadSeqRef.current) return;
          setDetail(single.data);
        } catch (cause) {
          if (seq !== loadSeqRef.current) return;
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
        const listRes = await listPromise;
        if (seq !== loadSeqRef.current) return;
        setItems(Array.isArray(listRes.data) ? listRes.data : []);
      } else {
        const listRes = await api.listRequests();
        if (seq !== loadSeqRef.current) return;
        setItems(Array.isArray(listRes.data) ? listRes.data : []);
      }
    } catch (cause) {
      if (seq !== loadSeqRef.current) return;
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

  const filteredGroups = useMemo(() => {
    if (!items) return [];
    const filtered = items.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      return matchesRefOrText(
        search,
        r.id,
        r.bundle_id,
        r.equipment_name,
        r.borrower_username,
        r.purpose_detail,
        purposeLabel(r.purpose_category),
      );
    });
    const groups = groupByBundle(filtered);
    const mult = sortDir === "asc" ? 1 : -1;
    return [...groups].sort((a, b) => {
      const firstA = a.items[0]!;
      const firstB = b.items[0]!;
      if (sortField === "qty") {
        const qtyA = a.items.reduce((sum, item) => sum + item.quantity_requested, 0);
        const qtyB = b.items.reduce((sum, item) => sum + item.quantity_requested, 0);
        return (qtyA - qtyB) * mult;
      }
      if (sortField === "duration") {
        return ((firstA.requested_days ?? 7) - (firstB.requested_days ?? 7)) * mult;
      }
      if (sortField === "purpose") {
        return purposeLabel(firstA.purpose_category).localeCompare(purposeLabel(firstB.purpose_category)) * mult;
      }
      return (Date.parse(firstA.created_at) - Date.parse(firstB.created_at)) * mult;
    });
  }, [items, search, statusFilter, sortField, sortDir]);

  const pagination = usePagination(filteredGroups, 10);
  const { setPage: setRequestPage } = pagination;

  const bundleSiblings = useMemo(() => {
    if (!detail?.bundle_id || !items) return [];
    return items.filter((r) => r.bundle_id === detail.bundle_id);
  }, [detail, items]);

  const bundleApprovedCount = useMemo(
    () => bundleSiblings.filter((r) => r.status === "APPROVED").length,
    [bundleSiblings],
  );

  function toggleSort(field: RequestSortField) {
    setRequestPage(1);
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "submitted" ? "desc" : "asc");
    }
  }

  function toggleBundle(bundleId: string) {
    setExpandedBundles((prev) => ({ ...prev, [bundleId]: !prev[bundleId] }));
  }

  async function copyRef(value: string) {
    try {
      await navigator.clipboard?.writeText(value);
      setCopiedId(value);
      setTimeout(() => setCopiedId((curr) => (curr === value ? null : curr)), 1500);
    } catch {
      // Clipboard unavailable in headless/restricted context.
    }
  }

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
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold text-text">Request details</h1>
                  <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                    {shortRef(detail.id)}
                  </span>
                </div>
                <RequestStatusBadge status={detail.status} />
              </div>

              {detail.status === "EXPIRED" ? (
                <div className="mb-4">
                  <Alert tone="warning">
                    This request expired on {formatBangkok(detail.expires_at)} and can no longer be approved or checked out.
                  </Alert>
                </div>
              ) : null}

              {actionError ? (
                <div className="mb-4">
                  <Alert tone="danger">{actionError}</Alert>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailBox label="Request ID">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs">{detail.id}</span>
                    <button
                      type="button"
                      onClick={() => void copyRef(shortRef(detail.id))}
                      aria-label="Copy short request reference"
                      className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-xs text-text-muted hover:text-primary"
                    >
                      {copiedId === shortRef(detail.id) ? (
                        <Check aria-hidden="true" className="h-3 w-3 text-success" />
                      ) : (
                        <Copy aria-hidden="true" className="h-3 w-3" />
                      )}
                      <span>{copiedId === shortRef(detail.id) ? "Copied" : shortRef(detail.id)}</span>
                    </button>
                  </div>
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
                {detail.expires_at ? (
                  <DetailBox label="Expires at">{formatBangkok(detail.expires_at)}</DetailBox>
                ) : null}
                {detail.bundle_id ? (
                  <DetailBox label="Bundle ID">
                    <span className="inline-flex flex-wrap items-center gap-2 font-mono text-xs">
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
                        {shortRef(detail.bundle_id)}
                      </span>
                      <span>{detail.bundle_id}</span>
                    </span>
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
                      <Th className="w-[55%]">Equipment</Th>
                      <Th className="w-[15%]">Qty</Th>
                      <Th className="w-[22%]">Status</Th>
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
                      <td className="truncate px-4 py-3 font-medium text-text">
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
            Select any request row to inspect full details, expand bundle sets, or take action.
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

      {actionError ? (
        <Alert tone="danger">{actionError}</Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-3 rounded-card border border-border bg-white p-4 sm:grid-cols-4">
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
              onChange={(e) => {
                setSearch(e.target.value);
                setRequestPage(1);
              }}
              placeholder="Search by equipment, borrower, purpose, or #ref code…"
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
            onChange={(e) => {
              setStatusFilter(e.target.value as "" | RequestStatus);
              setRequestPage(1);
            }}
            className="h-10 w-full rounded-control border border-border bg-white px-3 text-sm text-text"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="EXPIRED">Expired</option>
            <option value="CHECKED_OUT">Checked out</option>
          </select>
        </div>
        <div>
          <label htmlFor="requests-sort" className="mb-1 block text-xs font-medium text-text-muted">
            Sort by
          </label>
          <select
            id="requests-sort"
            value={`${sortField}:${sortDir}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split(":") as [RequestSortField, SortDir];
              setSortField(field);
              setSortDir(dir);
              setRequestPage(1);
            }}
            className="h-10 w-full rounded-control border border-border bg-white px-3 text-sm text-text"
          >
            <option value="submitted:desc">Submitted (newest)</option>
            <option value="submitted:asc">Submitted (oldest)</option>
            <option value="qty:desc">Qty (high–low)</option>
            <option value="qty:asc">Qty (low–high)</option>
            <option value="duration:desc">Duration (longest)</option>
            <option value="duration:asc">Duration (shortest)</option>
            <option value="purpose:asc">Purpose (A–Z)</option>
            <option value="purpose:desc">Purpose (Z–A)</option>
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
      ) : filteredGroups.length === 0 ? (
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
                  <Th className={isCustodian ? "w-[40%] lg:w-[34%]" : "w-[54%] lg:w-[44%]"}>Request / Equipment</Th>
                  <Th
                    className={isCustodian ? "w-[11%] lg:w-[9%] px-3" : "w-[12%] lg:w-[10%] px-3"}
                    aria-sort={sortField === "qty" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <SortHeaderButton label="Qty" field="qty" activeField={sortField} dir={sortDir} onToggle={toggleSort} />
                  </Th>
                  <Th
                    className={isCustodian ? "w-[14%] lg:w-[11%] px-3" : "w-[14%] lg:w-[12%] px-3"}
                    aria-sort={sortField === "duration" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <SortHeaderButton
                      label="Duration"
                      field="duration"
                      activeField={sortField}
                      dir={sortDir}
                      onToggle={toggleSort}
                    />
                  </Th>
                  {isCustodian ? <Th className="w-[15%] lg:w-[14%]">Borrower</Th> : null}
                  <Th className={isCustodian ? "w-[20%] lg:w-[18%]" : "w-[20%] lg:w-[19%]"}>Status</Th>
                  <Th
                    className={isCustodian ? "hidden lg:w-[14%] lg:table-cell" : "hidden lg:w-[15%] lg:table-cell"}
                    aria-sort={sortField === "submitted" ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <SortHeaderButton
                      label="Submitted"
                      field="submitted"
                      activeField={sortField}
                      dir={sortDir}
                      onToggle={toggleSort}
                    />
                  </Th>
                </tr>
              }
            >
              {pagination.pageItems.map((group) => {
                const isMultiBundle = Boolean(group.bundleId && group.items.length > 1);
                const first = group.items[0]!;
                if (!isMultiBundle) {
                  return (
                    <tr
                      key={first.id}
                      onClick={() => navigate(requestPath(first.id))}
                      title="Click row to open request details"
                      className="cursor-pointer transition-colors hover:bg-primary/5"
                    >
                      <td className="px-4 py-2.5 align-top font-medium text-text">
                        <div className="flex items-start gap-2.5 overflow-hidden">
                          <span
                            aria-hidden="true"
                            className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center text-xs text-text-muted/40"
                          >
                            •
                          </span>
                          <div className="min-w-0 flex-1">
                            <Link
                              to={requestPath(first.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="block truncate text-primary hover:underline"
                            >
                              {first.equipment_name ?? first.equipment_id}
                            </Link>
                            <p className="mt-0.5 truncate text-[11px] font-normal text-text-muted">
                              <span className="font-mono">{shortRef(first.id)}</span> · {purposeLabel(first.purpose_category)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-top tabular-nums text-text">{first.quantity_requested}</td>
                      <td className="px-3 py-2.5 align-top tabular-nums text-text">{first.requested_days ?? 7}d</td>
                      {isCustodian ? (
                        <td className="truncate px-4 py-2.5 align-top text-text">
                          {first.borrower_username ?? first.borrower_id}
                        </td>
                      ) : null}
                      <td className="px-4 py-2.5 align-top">
                        <RequestStatusBadge status={first.status} />
                      </td>
                      <td className="hidden px-4 py-2.5 align-top text-xs tabular-nums text-text-muted lg:table-cell">
                        {new Date(first.created_at).toLocaleDateString("en-GB", { timeZone: "Asia/Bangkok" })}
                      </td>
                    </tr>
                  );
                }

                const bundleId = group.bundleId!;
                const expanded = Boolean(expandedBundles[bundleId]);
                const totalQty = group.items.reduce((sum, item) => sum + item.quantity_requested, 0);
                const pendingCount = group.items.filter((item) => item.status === "PENDING").length;
                const approvedCount = group.items.filter((item) => item.status === "APPROVED").length;
                const summaryNames = group.items.map((item) => item.equipment_name ?? item.equipment_id).join(", ");
                const colSpan = isCustodian ? 6 : 5;

                return (
                  <Fragment key={group.key}>
                    <tr
                      onClick={() => toggleBundle(bundleId)}
                      className={`cursor-pointer transition-colors hover:bg-primary/5 ${
                        expanded ? "bg-primary/[0.03]" : ""
                      }`}
                    >
                      <td className="px-4 py-2.5 align-top font-medium text-text">
                        <div className="flex items-start gap-2.5 overflow-hidden">
                          <button
                            type="button"
                            aria-expanded={expanded}
                            aria-label={`Toggle bundle ${shortRef(bundleId)}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBundle(bundleId);
                            }}
                            className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border bg-white text-text-muted hover:border-primary/40 hover:text-primary"
                          >
                            {expanded ? (
                              <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <Link
                              to={requestPath(first.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="block truncate text-primary hover:underline"
                            >
                              {summaryNames}
                            </Link>
                            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] font-normal text-text-muted">
                              <span className="font-mono">{shortRef(bundleId)}</span>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{purposeLabel(first.purpose_category)}</span>
                              <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                                Bundle ({group.items.length})
                              </span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-top tabular-nums text-text">{totalQty}</td>
                      <td className="px-3 py-2.5 align-top tabular-nums text-text">{first.requested_days ?? 7}d</td>
                      {isCustodian ? (
                        <td className="truncate px-4 py-2.5 align-top text-text">
                          {first.borrower_username ?? first.borrower_id}
                        </td>
                      ) : null}
                      <td className="px-4 py-2.5 align-top">
                        <RequestStatusBadge status={first.status} />
                      </td>
                      <td className="hidden px-4 py-2.5 align-top text-xs tabular-nums text-text-muted lg:table-cell">
                        {new Date(first.created_at).toLocaleDateString("en-GB", { timeZone: "Asia/Bangkok" })}
                      </td>
                    </tr>

                    {expanded ? (
                      <tr className="bg-primary/[0.02]">
                        <td colSpan={colSpan} className="px-4 py-3 pl-11">
                          <div className="space-y-2.5 rounded-control border border-border bg-white p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                              <span className="text-xs font-medium text-text-muted">
                                Bundle items ({group.items.length}) ·{" "}
                                <span className="font-mono">{shortRef(bundleId)}</span>
                              </span>
                              {isCustodian && (pendingCount > 0 || approvedCount > 0) ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  {pendingCount === group.items.length ? (
                                    <>
                                      <Button
                                        disabled={actionBusy}
                                        onClick={() => void runAction(() => api.approveBundle(bundleId))}
                                      >
                                        Approve bundle ({pendingCount})
                                      </Button>
                                      <Button
                                        variant="secondary"
                                        disabled={actionBusy}
                                        onClick={() => void runAction(() => api.rejectBundle(bundleId))}
                                      >
                                        Reject bundle
                                      </Button>
                                    </>
                                  ) : null}
                                  {approvedCount === group.items.length ? (
                                    <Button
                                      disabled={actionBusy}
                                      onClick={() =>
                                        void runAction(async () => {
                                          await api.checkoutBundle(bundleId);
                                          navigate("/loans", { state: { checkedOut: true } });
                                        })
                                      }
                                    >
                                      Check out bundle ({approvedCount})
                                    </Button>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>

                            <div className="divide-y divide-border/60">
                              {group.items.map((sub) => (
                                <div
                                  key={sub.id}
                                  className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-xs"
                                >
                                  <div className="flex min-w-0 items-center gap-2">
                                    <Link
                                      to={requestPath(sub.id)}
                                      className="truncate font-medium text-primary hover:underline"
                                    >
                                      {sub.equipment_name ?? sub.equipment_id}
                                    </Link>
                                    <span className="shrink-0 font-mono text-[11px] text-text-muted">
                                      {shortRef(sub.id)}
                                    </span>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-3">
                                    <span className="tabular-nums text-text-muted">Qty {sub.quantity_requested}</span>
                                    <RequestStatusBadge status={sub.status} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </Table>
          </div>

          <ul className="space-y-3 md:hidden">
            {pagination.pageItems.map((group) => {
              const isMulti = Boolean(group.bundleId && group.items.length > 1);
              const first = group.items[0]!;
              return (
                <li key={group.key}>
                  <Link
                    to={requestPath(first.id)}
                    className={`block rounded-card border border-border bg-white p-4 hover:border-primary/40 ${
                      isMulti ? "border-l-4 border-l-primary" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-text">
                        {isMulti
                          ? `${group.items.map((i) => i.equipment_name ?? i.equipment_id).join(", ")}`
                          : first.equipment_name ?? first.equipment_id}
                      </span>
                      <RequestStatusBadge status={first.status} />
                    </div>
                    <p className="mt-1 text-xs font-mono text-text-muted">
                      {shortRef(group.bundleId ?? first.id)}
                      {isMulti ? ` · Bundle (${group.items.length} items)` : ""}
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      Qty {group.items.reduce((s, i) => s + i.quantity_requested, 0)} · {first.requested_days ?? 7}d ·{" "}
                      {purposeLabel(first.purpose_category)}
                    </p>
                    {isCustodian ? (
                      <p className="mt-1 text-xs text-text-muted">
                        Borrower: {first.borrower_username ?? first.borrower_id}
                      </p>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>

          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </>
      )}
    </div>
  );
}
