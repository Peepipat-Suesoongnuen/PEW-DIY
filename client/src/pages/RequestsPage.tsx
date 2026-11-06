import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api, ApiError, type BorrowingRequest, type Equipment, type Loan } from "../lib/api";
import { CheckoutRequest } from "../components/CheckoutRequest";
import { LoanDetails } from "../components/LoanDetails";
import { itemPath, requestIdFromPathname, requestPath } from "../lib/paths";
import { useSession, useUnauthorizedRedirect } from "../lib/session";
import { Alert } from "../components/Alert";
import { Card } from "../components/Card";
import { DetailList } from "../components/DetailList";
import { EmptyState } from "../components/EmptyState";
import { Loading } from "../components/Loading";

type State = { owner: string; kind: "loading" | "loaded" | "error"; records?: BorrowingRequest[]; items?: Equipment[]; status?: number; requestId?: string };

export function RequestsPage() {
  const { user } = useSession();
  const location = useLocation();
  const id = requestIdFromPathname(location.pathname);
  const onUnauthorized = useUnauthorizedRedirect();
  const [state, setState] = useState<State>({ owner: "", kind: "loading" });
  const [revision, setRevision] = useState(0);
  const [created, setCreated] = useState<{ owner: string; loan: Loan }>();
  const title = id ? "Request details" : user?.role === "CUSTODIAN" ? "Submitted requests" : "My requests";

  useEffect(() => {
    let cancelled = false;
    const owner = user?.id ?? "";
    setState({ owner, kind: "loading" });
    Promise.all([id ? api.getRequest(id).then((r) => [r.data]) : api.listRequests().then((r) => r.data), api.listEquipment()])
      .then(([records, items]) => { if (!cancelled) setState({ owner, kind: "loaded", records, items: items.data }); })
      .catch((error) => {
        if (cancelled || onUnauthorized(error)) return;
        setState({ owner, kind: "error", status: error instanceof ApiError ? error.status : 0, requestId: error instanceof ApiError ? error.requestId : "n/a" });
      });
    return () => { cancelled = true; };
  }, [id, user?.id, onUnauthorized, revision]);

  const current = state.owner === user?.id ? state : { owner: "", kind: "loading" } as State;
  const showCreated = created?.owner === user?.id && user?.role === "CUSTODIAN" && (!id || created?.loan.request_id === id);
  return <section>
    <h1 className="mb-4 text-xl font-semibold">{title}</h1>
    {showCreated ? <Card><Alert tone="success">Checkout completed.</Alert><LoanDetails loan={created!.loan} /></Card> : null}
    {id ? <Link to="/requests" className="mb-4 inline-block text-primary underline">Back to requests</Link> : null}
    {!id && location.state?.submitted && user?.role === "BORROWER" ? <Alert tone="success">Request submitted.</Alert> : null}
    {current.kind === "loading" ? <Loading label="Loading requests…" /> : null}
    {current.kind === "error" ? <Alert tone="danger" requestId={current.requestId}>
      {current.status === 403 ? "You do not have access to this request." : current.status === 404 ? "Request not found." : "Could not load requests. Please try again."}
    </Alert> : null}
    {current.kind === "loaded" && !current.records?.length && !(id && showCreated) ? <EmptyState message={user?.role === "CUSTODIAN" ? "No submitted requests." : "No requests yet."} /> : null}
    <div className="mt-4 grid gap-4">
      {current.kind === "loaded" ? current.records?.map((record) => {
        const name = current.items?.find((item) => item.id === record.equipment_id)?.name ?? "Equipment";
        return <Card key={`${record.id}-${revision}`}>
          <h2 className="mb-3 text-lg font-semibold"><Link to={itemPath(record.equipment_id)} className="text-primary underline">{name}</Link></h2>
          <DetailList items={[
            { term: "Quantity", value: record.quantity_requested },
            { term: "Status", value: record.status === "SUBMITTED" ? "Submitted" : "Checked out" },
            { term: "Submitted", value: new Date(record.created_at).toLocaleString() },
          ]} />
          {user?.role === "CUSTODIAN" && record.status === "SUBMITTED" ? <CheckoutRequest requestId={record.id}
            onRefresh={() => { setCreated(undefined); setRevision((v) => v + 1); }}
            onSuccess={(loan) => {
              setCreated({ owner: user.id, loan });
              setState((previous) => ({ ...previous, records: previous.records?.filter((r) => r.id !== record.id) }));
              // Refresh queue AND catalog; detail becomes a committed-result view.
              if (!id) setRevision((v) => v + 1);
            }} /> : null}
          {!id ? <Link to={requestPath(record.id)} className="mt-3 inline-block text-primary underline">View request</Link> : null}
        </Card>;
      }) : null}
    </div>
  </section>;
}
