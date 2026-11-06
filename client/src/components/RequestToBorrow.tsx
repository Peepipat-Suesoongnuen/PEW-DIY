import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError, type Equipment } from "../lib/api";
import { useUnauthorizedRedirect } from "../lib/session";
import { Alert } from "./Alert";
import { Button } from "./Button";
import { Field } from "./Field";

export function RequestToBorrow({ item, refresh }: { item: Equipment; refresh: (value: Equipment) => void }) {
  const [quantity, setQuantity] = useState("1");
  const [fieldError, setFieldError] = useState("");
  const [failure, setFailure] = useState<{ message: string; requestId?: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [stockKnown, setStockKnown] = useState(true);
  const submitting = useRef(false);
  const navigate = useNavigate();
  const onUnauthorized = useUnauthorizedRedirect();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current || !stockKnown || item.quantity_available < 1) return;
    const value = Number(quantity);
    if (!quantity.trim() || !Number.isSafeInteger(value) || value < 1 || value > item.quantity_available) {
      setFieldError(`Enter a whole number from 1 to ${item.quantity_available}.`);
      return;
    }
    setFieldError(""); setFailure(null); setPending(true); submitting.current = true;
    try {
      await api.createRequest(item.id, value);
      navigate("/requests", { state: { submitted: true } });
    } catch (error) {
      if (onUnauthorized(error)) return;
      if (error instanceof ApiError && error.status === 409) {
        setFailure({ message: "This item is no longer available in the requested quantity.", requestId: error.requestId });
        setStockKnown(false);
        try { refresh((await api.getEquipment(item.id)).data); setStockKnown(true); }
        catch (refreshError) { if (!onUnauthorized(refreshError)) setFailure({ message: "Could not refresh availability. Reload this page before trying again." }); }
      } else {
        setFailure({
          message: error instanceof ApiError && error.status === 0
            ? "Could not confirm submission. Check My requests before submitting again."
            : "Could not submit the request. Please try again.",
          requestId: error instanceof ApiError ? error.requestId : undefined,
        });
      }
    } finally { submitting.current = false; setPending(false); }
  }

  return <div className="mt-6 border-t border-border pt-5">
    <h2 className="text-lg font-semibold">Request to borrow</h2>
    <p className="my-2 text-sm text-text-muted">Requests do not reserve equipment. Availability is checked again at checkout.</p>
    {failure ? <Alert tone="danger" requestId={failure.requestId}>{failure.message} <Link to="/requests" className="underline">My requests</Link></Alert> : null}
    {item.quantity_available < 1 ? <p className="mt-3 text-sm">This item is currently unavailable.</p> : <form onSubmit={submit} noValidate className="mt-4 flex max-w-md flex-col gap-3">
      <Field id="request-quantity" label="Quantity" type="number" min={1} max={item.quantity_available} step={1}
        value={quantity} onChange={(event) => { setQuantity(event.target.value); setFieldError(""); }} error={fieldError} disabled={pending} />
      <Button type="submit" loading={pending} disabled={!stockKnown}>{pending ? "Submitting…" : "Submit request"}</Button>
    </form>}
  </div>;
}
