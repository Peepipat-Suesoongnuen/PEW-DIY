import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api, ApiError, type Equipment, type Loan } from "../lib/api";
import { useSession, useUnauthorizedRedirect } from "../lib/session";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Loading } from "../components/Loading";
import { EmptyState } from "../components/EmptyState";
import { LoanDetails } from "../components/LoanDetails";
import { itemPath, loanPath, loanIdFromPathname } from "../lib/paths";

export function LoansPage() {
  const { user } = useSession();
  const id = loanIdFromPathname(useLocation().pathname);
  const onUnauthorized = useUnauthorizedRedirect();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ owner: string; records?: Loan[]; items?: Equipment[]; error?: string; requestId?: string }>({ owner: "" });
  useEffect(() => {
    let cancelled = false;
    const owner = user?.id ?? "";
    setState({ owner });
    if (user?.role !== "BORROWER") return;
    Promise.all([
      id ? api.getLoan(id).then((r) => [r.data]) : api.listLoans().then((r) => r.data),
      api.listEquipment().catch((error) => {
        // Optional display enrichment must not hide a valid loan on catalog
        // outage. A401 still expires the session through the shared handler.
        if (error instanceof ApiError && error.status === 401) throw error;
        return { data: [] as Equipment[] };
      }),
    ])
      .then(([records, items]) => { if (!cancelled) setState({ owner, records, items: items.data }); })
      .catch((error) => {
        if (cancelled || onUnauthorized(error)) return;
        setState({ owner, error: error instanceof ApiError && error.status === 403 ? "You do not have access to this loan."
          : error instanceof ApiError && error.status === 404 ? "Loan not found." : "Could not load loans. Please try again.",
          requestId: error instanceof ApiError ? error.requestId : "n/a" });
      });
    return () => { cancelled = true; };
  }, [user?.id, user?.role, id, revision, onUnauthorized]);
  if (!user) return <Loading label="Loading loans…" />;
  if (user.role !== "BORROWER") return <Alert tone="danger">You do not have access to this page.</Alert>;
  const current = state.owner === user.id ? state : { owner: "" };
  return <section className="space-y-4"><h1 className="text-xl font-semibold">{id ? "Loan details" : "My active loans"}</h1>
    <div className="flex flex-wrap items-center gap-4">
      {id ? <Link to="/loans" className="text-primary underline">Back to my loans</Link> : null}
      <Button variant="secondary" onClick={() => setRevision((v) => v + 1)}>Refresh loans</Button>
    </div>
    {current.error ? <Alert tone="danger" requestId={current.requestId}>{current.error}</Alert>
      : !current.records ? <Loading label="Loading loans…" />
      : !current.records.length ? <EmptyState message="No active loans." />
      : current.records.map((loan) => <Card key={loan.id}><LoanDetails loan={loan}
        borrowerName={loan.borrower_id === user.id ? user.username : undefined}
        equipmentName={current.items?.find((item) => item.id === loan.equipment_id)?.name} />
        <Link to={itemPath(loan.equipment_id)} className="mt-3 inline-block text-primary underline">View equipment</Link>
        {!id ? <Link to={loanPath(loan.id)} className="ml-4 text-primary underline">View loan</Link> : null}
      </Card>)}
  </section>;
}
