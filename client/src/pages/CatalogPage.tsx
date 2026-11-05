import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert } from "../components/Alert";
import { AvailabilityBadge } from "../components/AvailabilityBadge";
import { EmptyState } from "../components/EmptyState";
import { ItemCard } from "../components/ItemCard";
import { Loading } from "../components/Loading";
import { Table, Th } from "../components/Table";
import { api, type Equipment } from "../lib/api";
import { useUnauthorizedRedirect } from "../lib/session";

type CatalogState =
  | { kind: "loading" }
  | { kind: "loaded"; items: Equipment[] }
  | { kind: "error"; message: string; requestId: string };

/**
 * Equipment Catalog (ui-spec §2): Table on tablet/desktop, ItemCard list on
 * mobile; states loading/empty/error per f-02 §3 (never render an unreceived
 * quantity as zero, empty is not an error); no search/filter in Sprint 1.
 */
export function CatalogPage() {
  const [state, setState] = useState<CatalogState>({ kind: "loading" });
  const navigate = useNavigate();
  const onUnauthorized = useUnauthorizedRedirect();

  useEffect(() => {
    let cancelled = false;
    api
      .listEquipment()
      .then((res) => {
        if (!cancelled) setState({ kind: "loaded", items: res.data });
      })
      .catch((err) => {
        if (cancelled || onUnauthorized(err)) return;
        setState({
          kind: "error",
          message: "Something went wrong. Please try again.",
          requestId: err instanceof Error && "requestId" in err ? String((err as { requestId: string }).requestId) : "n/a",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [onUnauthorized]);

  return (
    <section>
      <h1 className="mb-4 text-xl font-semibold text-text">Equipment Catalog</h1>

      {state.kind === "loading" ? <Loading label="Loading catalog…" /> : null}

      {state.kind === "error" ? (
        <Alert tone="danger" requestId={state.requestId}>
          {state.message}
        </Alert>
      ) : null}

      {state.kind === "loaded" && state.items.length === 0 ? (
        <EmptyState message="The catalog has no items yet." />
      ) : null}

      {state.kind === "loaded" && state.items.length > 0 ? (
        <>
          {/* Mobile: stacked ItemCard list (ui-spec §2.4). */}
          <div className="flex flex-col gap-3 md:hidden">
            {state.items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>

          {/* Tablet/desktop: dense table (ui-spec §2.2/§2.4). */}
          <div className="hidden md:block">
            <Table
              header={
                <tr>
                  <Th>Name</Th>
                  <Th className="hidden lg:table-cell">Description</Th>
                  <Th>Category</Th>
                  <Th className="hidden lg:table-cell">Total</Th>
                  <Th>Available</Th>
                  <Th>Availability</Th>
                </tr>
              }
            >
              {state.items.map((item) => (
                <tr
                  key={item.id}
                  className="cursor-pointer hover:bg-white/50"
                  onClick={() => navigate(`/items/${item.id}`)}
                >
                  <td className="px-4 py-3">
                    <a
                      href={`/items/${item.id}`}
                      aria-label={`View ${item.name}`}
                      className="font-medium text-primary hover:underline"
                      onClick={(event) => {
                        event.preventDefault();
                        navigate(`/items/${item.id}`);
                      }}
                    >
                      {item.name}
                    </a>
                  </td>
                  <td className="hidden max-w-[24rem] truncate px-4 py-3 text-text-muted lg:table-cell" title={item.description}>
                    {item.description}
                  </td>
                  <td className="px-4 py-3">{item.category}</td>
                  <td className="hidden px-4 py-3 lg:table-cell">{item.quantity_total}</td>
                  <td className="px-4 py-3">{item.quantity_available}</td>
                  <td className="px-4 py-3">
                    <AvailabilityBadge availability={item.availability} />
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        </>
      ) : null}
    </section>
  );
}
