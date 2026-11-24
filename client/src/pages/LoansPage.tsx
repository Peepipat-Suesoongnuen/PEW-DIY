import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, Printer, Search } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api, ApiError, type Loan, type LoanScope } from "../lib/api";
import { loanIdFromPathname, loanPath } from "../lib/paths";
import { useSession, useUnauthorizedRedirect } from "../lib/session";
import { Alert } from "../components/Alert";
import { BackButton } from "../components/BackButton";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { Loading } from "../components/Loading";
import { LoanDetails } from "../components/LoanDetails";
import { LoanStatusBadge } from "../components/StatusBadge";
import { Table, Th } from "../components/Table";

export function LoansPage() {
  const { user } = useSession();
  const { pathname, state } = useLocation();
  const navigate = useNavigate();
  const onUnauthorized = useUnauthorizedRedirect();

  const detailId = loanIdFromPathname(pathname);
  const isCustodian = user?.role === "CUSTODIAN";
  const pageTitle = isCustodian ? "Loans" : "My loans";
  const checkedOut = Boolean((state as { checkedOut?: boolean } | null)?.checkedOut);

  const [scope, setScope] = useState<LoanScope>("active");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Loan[] | null>(null);
  const [detail, setDetail] = useState<Loan | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);

  const [returnNote, setReturnNote] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setNotFound(false);
    try {
      if (detailId) {
        try {
          const single = await api.getLoan(detailId);
          setDetail(single.data);
          const listRes = await api.listLoans(isCustodian ? "all" : "history");
          setItems(Array.isArray(listRes.data) ? listRes.data : []);
        } catch (cause) {
          if (onUnauthorized(cause)) return;
          if (cause instanceof ApiError && cause.status === 404) {
            setNotFound(true);
            setDetail(null);
            return;
          }
          if (cause instanceof ApiError && cause.status === 403) {
            setError({ message: "You do not have access to this loan.", requestId: cause.requestId });
            setDetail(null);
            return;
          }
          throw cause;
        }
      } else {
        setDetail(null);
        const listRes = await api.listLoans(scope);
        setItems(Array.isArray(listRes.data) ? listRes.data : []);
      }
    } catch (cause) {
      if (onUnauthorized(cause)) return;
      setError({
        message: "We could not load loans right now. Please try again.",
        requestId: cause instanceof ApiError ? cause.requestId : undefined,
      });
    }
  }, [detailId, isCustodian, onUnauthorized, scope]);

  useEffect(() => {
    setReturnNote("");
    setActionError(null);
    void load();
  }, [load]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (l) =>
        l.id.toLowerCase().includes(q) ||
        (l.equipment_name ?? "").toLowerCase().includes(q) ||
        (l.borrower_username ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  const unreturnedBundleCount = useMemo(() => {
    if (!detail?.bundle_id || !items) return 0;
    return items.filter((l) => l.bundle_id === detail.bundle_id && l.status !== "RETURNED").length;
  }, [detail, items]);

  async function runReturnAction(fn: () => Promise<unknown>) {
    setActionBusy(true);
    setActionError(null);
    try {
      await fn();
      await load();
    } catch (cause) {
      if (onUnauthorized(cause)) return;
      setActionError(cause instanceof ApiError ? cause.message : "Could not process return action.");
    } finally {
      setActionBusy(false);
    }
  }

  if (detailId) {
    return (
      <div className="space-y-6">
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <BackButton to="/loans" label={`Back to ${pageTitle}`} />
          {detail ? (
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer aria-hidden="true" className="h-4 w-4" />
              <span>Print loan slip</span>
            </Button>
          ) : null}
        </div>

        {notFound ? (
          <Card title="Loan not found">
            <p className="text-sm text-text-muted">This loan record could not be found.</p>
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
          <Loading label="Loading loan details…" />
        ) : (
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  PEW-DIY Equipment Loan Slip
                </p>
                <h1 className="text-xl font-semibold text-text">Loan details</h1>
              </div>
            </div>

            {checkedOut ? (
              <div className="no-print mb-4">
                <Alert tone="success">Checkout completed.</Alert>
              </div>
            ) : null}

            {actionError ? (
              <div className="no-print mb-4">
                <Alert tone="danger">{actionError}</Alert>
              </div>
            ) : null}

            <LoanDetails
              loan={detail}
              borrowerName={detail.borrower_username ?? detail.borrower_id}
              equipmentName={detail.equipment_name ?? detail.equipment_id}
            />

            {!isCustodian && detail.status === "ACTIVE" ? (
              <div className="no-print mt-6 space-y-3 border-t border-border pt-4">
                <p className="text-sm text-text-muted">
                  Returning equipment at the lab counter? Notify the custodian so they can verify physical receipt and restore stock.
                </p>
                <div>
                  <label htmlFor="borrower-return-note" className="mb-1 block text-sm font-medium text-text">
                    Return note (optional)
                  </label>
                  <input
                    id="borrower-return-note"
                    type="text"
                    maxLength={500}
                    value={returnNote}
                    onChange={(e) => setReturnNote(e.target.value)}
                    placeholder="e.g., Dropped off at Locker B"
                    disabled={actionBusy}
                    className="h-10 w-full max-w-lg rounded-control border border-border bg-white px-3 text-sm text-text"
                  />
                </div>
                <Button
                  disabled={actionBusy}
                  loading={actionBusy}
                  onClick={() => void runReturnAction(() => api.requestReturn(detail.id, returnNote.trim()))}
                >
                  Notify return
                </Button>
              </div>
            ) : null}

            {!isCustodian && detail.status === "RETURN_PENDING" ? (
              <div className="no-print mt-6 border-t border-border pt-4">
                <Alert tone="warning">
                  Return requested. Waiting for custodian confirmation to restore stock.
                </Alert>
              </div>
            ) : null}

            {isCustodian && detail.status !== "RETURNED" ? (
              <div className="no-print mt-6 space-y-3 border-t border-border pt-4">
                <div>
                  <label htmlFor="custodian-return-note" className="mb-1 block text-sm font-medium text-text">
                    Inspection / return note (optional)
                  </label>
                  <input
                    id="custodian-return-note"
                    type="text"
                    maxLength={500}
                    value={returnNote}
                    onChange={(e) => setReturnNote(e.target.value)}
                    placeholder="Optional condition or inspection note…"
                    disabled={actionBusy}
                    className="h-10 w-full max-w-lg rounded-control border border-border bg-white px-3 text-sm text-text"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={actionBusy}
                    loading={actionBusy}
                    onClick={() => void runReturnAction(() => api.confirmReturn(detail.id, returnNote.trim()))}
                  >
                    Confirm return
                  </Button>
                  {detail.bundle_id && unreturnedBundleCount > 1 ? (
                    <Button
                      variant="secondary"
                      disabled={actionBusy}
                      onClick={() =>
                        void runReturnAction(() =>
                          api.confirmBundleReturn(detail.bundle_id!, returnNote.trim()),
                        )
                      }
                    >
                      Confirm entire bundle return ({unreturnedBundleCount})
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Card>
        )}
      </div>
    );
  }

  const scopeOptions: Array<{ value: LoanScope; label: string }> = isCustodian
    ? [
        { value: "active", label: "Active" },
        { value: "history", label: "History" },
        { value: "all", label: "All loans" },
      ]
    : [
        { value: "active", label: "Active" },
        { value: "history", label: "History" },
      ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text">{pageTitle}</h1>
        <p className="mt-0.5 text-sm text-text-muted">
          Select any loan row to view full details, notify or confirm returns, or print a loan slip.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-white p-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Loan scope">
          {scopeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={scope === opt.value}
              onClick={() => setScope(opt.value)}
              className={`rounded-control px-3.5 py-2 text-sm font-medium transition-colors ${
                scope === opt.value
                  ? "bg-primary text-white"
                  : "border border-border bg-white text-text hover:border-primary/40"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-60 flex-1 sm:max-w-xs">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-text-muted" />
          <input
            type="search"
            aria-label="Search loans"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by equipment, borrower, or ID…"
            className="h-10 w-full rounded-control border border-border bg-white pl-9 pr-3 text-sm text-text"
          />
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
            search
              ? "No loans matched your search."
              : scope === "active"
                ? "No active loans."
                : "No loans found in this view."
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
                  {isCustodian ? <Th>Borrower</Th> : null}
                  <Th>Due date</Th>
                  <Th>Status</Th>
                  <Th className="w-10">
                    <span className="sr-only">Open</span>
                  </Th>
                </tr>
              }
            >
              {filteredItems.map((loan) => (
                <tr
                  key={loan.id}
                  onClick={() => navigate(loanPath(loan.id))}
                  title="Click row to open loan details"
                  className="cursor-pointer transition-colors hover:bg-primary/5"
                >
                  <td className="px-4 py-3 font-medium text-text">
                    <Link
                      to={loanPath(loan.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary hover:underline"
                    >
                      {loan.equipment_name ?? loan.equipment_id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text">{loan.quantity_borrowed}</td>
                  {isCustodian ? (
                    <td className="px-4 py-3 text-text">
                      {loan.borrower_username ?? loan.borrower_id}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 text-text">{loan.due_on}</td>
                  <td className="px-4 py-3">
                    <LoanStatusBadge status={loan.status} overdue={loan.overdue} />
                  </td>
                  <td className="px-4 py-3 text-right text-text-muted">
                    <ChevronRight aria-hidden="true" className="ml-auto h-4 w-4" />
                  </td>
                </tr>
              ))}
            </Table>
          </div>

          <ul className="space-y-3 md:hidden">
            {filteredItems.map((loan) => (
              <li key={loan.id}>
                <Link
                  to={loanPath(loan.id)}
                  className="block rounded-card border border-border bg-white p-4 hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-text">
                      {loan.equipment_name ?? loan.equipment_id}
                    </span>
                    <LoanStatusBadge status={loan.status} overdue={loan.overdue} />
                  </div>
                  <p className="mt-1 text-sm text-text-muted">
                    Qty {loan.quantity_borrowed} · Due {loan.due_on}
                  </p>
                  {isCustodian ? (
                    <p className="mt-1 text-xs text-text-muted">
                      Borrower: {loan.borrower_username ?? loan.borrower_id}
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
