import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Alert } from "../components/Alert";
import { AvailabilityBadge, QuantityDisplay } from "../components/AvailabilityBadge";
import { Card } from "../components/Card";
import { DetailList } from "../components/DetailList";
import { EmptyState } from "../components/EmptyState";
import { Loading } from "../components/Loading";
import { RequestToBorrow } from "../components/RequestToBorrow";
import { api, type Equipment } from "../lib/api";
import { useItemRouteId } from "../lib/paths";
import { useSession, useUnauthorizedRedirect } from "../lib/session";

type DetailState =
  | { kind: "loading" }
  | { kind: "loaded"; item: Equipment }
  | { kind: "missing" }
  | { kind: "error"; message: string; requestId: string };

/**
 * Item Detail (ui-spec §3): item information card (DetailList + Badge +
 * Quantity Tracking display) with loading/missing/error states.
 *
 * F-04 (#11) adds the Borrower request panel defined by ui-spec §3.2.
 * Backend stock/role checks remain authoritative.
 */
export function ItemDetailPage() {
  const { user } = useSession();
  // Route boundary (PR #34 review round 2): the id comes from the RAW pathname
  // decoded exactly once — useParams() would collapse the distinct opaque ids
  // `fixture/opaque` and `fixture%2Fopaque` into the same value.
  const id = useItemRouteId();
  const [state, setState] = useState<DetailState>({ kind: "loading" });
  const onUnauthorized = useUnauthorizedRedirect();

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    api
      .getEquipment(id ?? "")
      .then((res) => {
        if (!cancelled) setState({ kind: "loaded", item: res.data });
      })
      .catch((err) => {
        if (cancelled || onUnauthorized(err)) return;
        if (err instanceof Error && "status" in err && (err as { status: number }).status === 404) {
          setState({ kind: "missing" });
          return;
        }
        setState({
          kind: "error",
          message: "Something went wrong. Please try again.",
          requestId: err instanceof Error && "requestId" in err ? String((err as { requestId: string }).requestId) : "n/a",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [id, onUnauthorized]);

  return (
    <section>
      <Link
        to="/catalog"
        aria-label="Back to catalog"
        className="mb-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Back to catalog
      </Link>

      {state.kind === "loading" ? <Loading label="Loading item…" /> : null}

      {state.kind === "error" ? (
        <Alert tone="danger" requestId={state.requestId}>
          {state.message}
        </Alert>
      ) : null}

      {state.kind === "missing" ? (
        <EmptyState
          message="Item not found."
          action={
            <Link to="/catalog" className="text-primary underline">
              Back to catalog
            </Link>
          }
        />
      ) : null}

      {state.kind === "loaded" ? (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-xl font-semibold text-text">{state.item.name}</h1>
            <AvailabilityBadge availability={state.item.availability} />
          </div>
          <p className="mt-3 text-base text-text">
            {state.item.description ? (
              state.item.description
            ) : (
              <span className="text-text-muted">No description</span>
            )}
          </p>
          <div className="mt-4">
            <DetailList
              items={[
                { term: "Category", value: state.item.category },
                {
                  term: "Quantity",
                  value: (
                    <QuantityDisplay
                      available={state.item.quantity_available}
                      total={state.item.quantity_total}
                    />
                  ),
                },
              ]}
            />
          </div>
          {user?.role === "BORROWER" ? <RequestToBorrow item={state.item} refresh={(item) => setState({ kind: "loaded", item })} /> : null}
        </Card>
      ) : null}
    </section>
  );
}
