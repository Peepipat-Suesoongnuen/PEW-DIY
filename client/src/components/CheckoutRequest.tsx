import { useRef, useState } from "react";
import { api, ApiError, type Loan } from "../lib/api";
import { useUnauthorizedRedirect } from "../lib/session";
import { Alert } from "./Alert";
import { Button } from "./Button";

interface CheckoutRequestProps {
  requestId: string;
  bundleId?: string | null;
  bundleApprovedCount?: number;
  disabled?: boolean;
  onSuccess: (loan: Loan) => void;
  onBundleSuccess?: (loans: Loan[]) => void;
  onRefresh: () => void;
}

function conflictMessage(code: string): string {
  switch (code) {
    case "INSUFFICIENT_AVAILABILITY":
      return "Insufficient equipment stock available for checkout. Refresh requests and availability.";
    case "ALREADY_CHECKED_OUT":
      return "This request has already been checked out. Refresh requests.";
    case "NOT_APPROVED":
      return "Approve this request before checking it out.";
    case "EQUIPMENT_RETIRED":
      return "Retired equipment cannot be checked out.";
    case "REQUEST_EXPIRED":
      return "This approved request has expired and cannot be checked out.";
    default:
      return "This request cannot be checked out. Refresh requests and availability.";
  }
}

export function CheckoutRequest({
  requestId,
  bundleId,
  bundleApprovedCount = 0,
  disabled = false,
  onSuccess,
  onBundleSuccess,
  onRefresh,
}: CheckoutRequestProps) {
  const onUnauthorized = useUnauthorizedRedirect();
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; requestId?: string }>();

  async function checkout(mode: "single" | "bundle") {
    if (lock.current || disabled) return;
    lock.current = true;
    setPending(true);
    try {
      if (mode === "bundle" && bundleId) {
        const res = await api.checkoutBundle(bundleId);
        if (onBundleSuccess) onBundleSuccess(res.data);
        else if (res.data[0]) onSuccess(res.data[0]);
      } else {
        const res = await api.checkout(requestId);
        onSuccess(res.data);
      }
    } catch (cause) {
      if (onUnauthorized(cause)) return;
      const message =
        cause instanceof ApiError && cause.status === 409
          ? conflictMessage(cause.code)
          : cause instanceof ApiError && cause.status === 404
            ? "Request or equipment record no longer exists. Refresh requests."
            : cause instanceof ApiError && cause.status === 0
              ? "The checkout outcome is uncertain. Refresh requests before trying again."
              : "Could not complete checkout. Refresh requests before trying again.";
      setError({ message, requestId: cause instanceof ApiError ? cause.requestId : "n/a" });
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  return (
    <div className="no-print mt-4 space-y-3">
      {error ? (
        <div className="space-y-2">
          <Alert tone="danger" requestId={error.requestId}>
            {error.message}
          </Alert>
          <Button variant="secondary" onClick={onRefresh}>
            Refresh requests
          </Button>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button disabled={disabled || pending || !!error} loading={pending} onClick={() => void checkout("single")}>
          {pending ? "Checking out…" : "Check out"}
        </Button>
        {bundleId && bundleApprovedCount > 1 ? (
          <Button
            variant="secondary"
            disabled={disabled || pending || !!error}
            onClick={() => void checkout("bundle")}
          >
            Check out entire bundle ({bundleApprovedCount})
          </Button>
        ) : null}
      </div>
    </div>
  );
}
