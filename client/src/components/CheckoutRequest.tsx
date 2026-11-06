import { useRef, useState } from "react";
import { api, ApiError, type Loan } from "../lib/api";
import { useUnauthorizedRedirect } from "../lib/session";
import { Button } from "./Button";
import { Alert } from "./Alert";

export function CheckoutRequest({ requestId, onSuccess, onRefresh }: { requestId: string; onSuccess: (loan: Loan) => void; onRefresh: () => void }) {
  const onUnauthorized = useUnauthorizedRedirect();
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; requestId?: string }>();
  async function checkout() {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    try { onSuccess((await api.checkout(requestId)).data); }
    catch (cause) {
      if (onUnauthorized(cause)) return;
      setError({ message: cause instanceof ApiError && cause.status === 409
        ? "This request cannot be checked out. Refresh requests and availability."
        : cause instanceof ApiError && cause.status === 0
          ? "The checkout outcome is uncertain. Refresh requests before trying again."
          : "Could not complete checkout. Refresh requests before trying again.", requestId: cause instanceof ApiError ? cause.requestId : "n/a" });
      // A refresh remounts this control after reconciliation, never blind retry.
    } finally { setPending(false); }
  }
  return <div className="mt-4 space-y-3">
    {error ? <><Alert tone="danger" requestId={error.requestId}>{error.message}</Alert><Button variant="secondary" onClick={onRefresh}>Refresh requests</Button></> : null}
    <Button disabled={pending || !!error} onClick={checkout}>{pending ? "Checking out…" : "Check out"}</Button>
  </div>;
}
