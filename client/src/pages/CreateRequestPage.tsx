import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  api,
  ApiError,
  PURPOSE_CATEGORIES,
  type Equipment,
  type PurposeCategory,
} from "../lib/api";
import { useSession, useUnauthorizedRedirect } from "../lib/session";
import { Alert } from "../components/Alert";
import { BackButton } from "../components/BackButton";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EquipmentImage } from "../components/EquipmentImage";
import { Loading } from "../components/Loading";

interface SelectedLine {
  equipmentId: string;
  quantity: string;
}

export function CreateRequestPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const onUnauthorized = useUnauthorizedRedirect();

  const [catalog, setCatalog] = useState<Equipment[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const preselectedId = searchParams.get("equipmentId");
  const [lines, setLines] = useState<SelectedLine[]>([]);
  const [pickerId, setPickerId] = useState("");
  const [purposeCategory, setPurposeCategory] = useState<PurposeCategory>("COURSE_PROJECT");
  const [purposeDetail, setPurposeDetail] = useState("");
  const [requestedDays, setRequestedDays] = useState("7");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<{ message: string; requestId?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false);

  const loadCatalog = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await api.listEquipment({ availability: "AVAILABLE", status: "ACTIVE", sort: "name_asc" });
      setCatalog(res.data);
      if (preselectedId && res.data.some((i) => i.id === preselectedId)) {
        setLines((prev) => (prev.length === 0 ? [{ equipmentId: preselectedId, quantity: "1" }] : prev));
      } else if (res.data[0]) {
        setPickerId(res.data[0].id);
      }
    } catch (cause) {
      if (onUnauthorized(cause)) return;
      setLoadError("Could not load available equipment.");
    }
  }, [onUnauthorized, preselectedId]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const equipmentById = useMemo(() => {
    const map = new Map<string, Equipment>();
    for (const item of catalog ?? []) map.set(item.id, item);
    return map;
  }, [catalog]);

  const unpickedItems = useMemo(() => {
    const selectedIds = new Set(lines.map((l) => l.equipmentId));
    return (catalog ?? []).filter((item) => !selectedIds.has(item.id) && item.quantity_available > 0);
  }, [catalog, lines]);

  function addLine() {
    const targetId = pickerId && unpickedItems.some((i) => i.id === pickerId) ? pickerId : unpickedItems[0]?.id;
    if (!targetId) return;
    setLines((prev) => [...prev, { equipmentId: targetId, quantity: "1" }]);
    const remaining = unpickedItems.filter((i) => i.id !== targetId);
    setPickerId(remaining[0]?.id ?? "");
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.items;
      return next;
    });
  }

  function removeLine(equipmentId: string) {
    setLines((prev) => prev.filter((l) => l.equipmentId !== equipmentId));
  }

  function updateQuantity(equipmentId: string, quantity: string) {
    setLines((prev) => prev.map((l) => (l.equipmentId === equipmentId ? { ...l, quantity } : l)));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[`qty:${equipmentId}`];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;

    const errors: Record<string, string> = {};
    if (lines.length === 0) {
      errors.items = "Select at least one available equipment item.";
    }
    const parsedItems: Array<{ equipment_id: string; quantity_requested: number }> = [];
    for (const line of lines) {
      const eq = equipmentById.get(line.equipmentId);
      const maxQty = eq?.quantity_available ?? 1;
      const qty = Number(line.quantity);
      if (!line.quantity.trim() || !Number.isSafeInteger(qty) || qty < 1 || qty > maxQty) {
        errors[`qty:${line.equipmentId}`] = `Enter a whole number from 1 to ${maxQty}.`;
      } else {
        parsedItems.push({ equipment_id: line.equipmentId, quantity_requested: qty });
      }
    }

    const days = Number(requestedDays);
    if (!requestedDays.trim() || !Number.isSafeInteger(days) || days < 1 || days > 14) {
      errors.requestedDays = "Enter a whole number between 1 and 14 calendar days.";
    }

    if (purposeCategory === "OTHER" && !purposeDetail.trim()) {
      errors.purposeDetail = "Please specify details when selecting Other.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitError(null);
    setSubmitting(true);
    lock.current = true;
    try {
      if (parsedItems.length === 1) {
        await api.createRequest(parsedItems[0]!.equipment_id, parsedItems[0]!.quantity_requested, {
          purpose_category: purposeCategory,
          purpose_detail: purposeDetail.trim(),
          requested_days: days,
        });
      } else {
        await api.createRequestBundle({
          items: parsedItems,
          purpose_category: purposeCategory,
          purpose_detail: purposeDetail.trim(),
          requested_days: days,
        });
      }
      navigate("/requests", { state: { submitted: true } });
    } catch (cause) {
      if (onUnauthorized(cause)) return;
      if (cause instanceof ApiError && cause.status === 409) {
        setSubmitError({
          message: "Requested quantity is no longer available. Availability has been refreshed.",
          requestId: cause.requestId,
        });
        await loadCatalog();
      } else {
        setSubmitError({
          message: cause instanceof ApiError ? cause.message : "Could not submit your request. Please try again.",
          requestId: cause instanceof ApiError ? cause.requestId : undefined,
        });
      }
    } finally {
      lock.current = false;
      setSubmitting(false);
    }
  }

  if (user?.role === "CUSTODIAN") {
    return (
      <div className="space-y-4">
        <BackButton to="/catalog" label="Back to catalog" />
        <Alert tone="info">Only Borrower accounts can submit borrowing requests.</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackButton to="/catalog" label="Back to catalog" />
      </div>

      <div>
        <h1 className="text-xl font-semibold text-text">New Borrowing Request</h1>
        <p className="mt-1 text-sm text-text-muted">
          Select one or more available items, choose a duration between 1 and 14 calendar days, and submit for custodian approval. Requests do not reserve equipment.
        </p>
      </div>

      {loadError ? (
        <div className="space-y-3">
          <Alert tone="danger">{loadError}</Alert>
          <Button variant="secondary" onClick={() => void loadCatalog()}>
            Retry
          </Button>
        </div>
      ) : !catalog ? (
        <Loading label="Loading available equipment…" />
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {submitError ? (
            <Alert tone="danger" requestId={submitError.requestId}>
              {submitError.message}
            </Alert>
          ) : null}

          <Card title="1. Equipment items">
            {fieldErrors.items ? (
              <div className="mb-3">
                <Alert tone="danger">{fieldErrors.items}</Alert>
              </div>
            ) : null}

            {lines.length > 0 ? (
              <ul className="mb-4 divide-y divide-border">
                {lines.map((line) => {
                  const eq = equipmentById.get(line.equipmentId);
                  const maxQty = eq?.quantity_available ?? 1;
                  const err = fieldErrors[`qty:${line.equipmentId}`];
                  return (
                    <li key={line.equipmentId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-3">
                        <EquipmentImage
                          imageUrl={eq?.image_url}
                          name={eq?.name ?? line.equipmentId}
                          category={eq?.category ?? "Equipment"}
                          size="sm"
                        />
                        <div>
                          <p className="font-medium text-text">{eq?.name ?? line.equipmentId}</p>
                          <p className="text-xs text-text-muted">
                            {eq ? `${eq.category} · ${eq.quantity_available} available (allowed: 1–${maxQty})` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div>
                          <label htmlFor={`qty-${line.equipmentId}`} className="sr-only">
                            Quantity for {eq?.name ?? line.equipmentId}
                          </label>
                          <input
                            id={`qty-${line.equipmentId}`}
                            type="number"
                            min={1}
                            max={maxQty}
                            step={1}
                            value={line.quantity}
                            onChange={(e) => updateQuantity(line.equipmentId, e.target.value)}
                            disabled={submitting}
                            className="h-10 w-24 rounded-control border border-border bg-white px-3 text-sm text-text"
                          />
                          {err ? <p className="mt-1 text-xs text-danger">{err}</p> : null}
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${eq?.name ?? line.equipmentId}`}
                          onClick={() => removeLine(line.equipmentId)}
                          disabled={submitting}
                          className="rounded-control border border-border p-2.5 text-danger hover:bg-danger/10"
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-text-muted">No items selected yet. Add an item below.</p>
            )}

            {unpickedItems.length > 0 ? (
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-60 flex-1">
                  <label htmlFor="add-item-select" className="mb-1 block text-xs font-medium text-text-muted">
                    Add equipment to request
                  </label>
                  <select
                    id="add-item-select"
                    value={
                      pickerId && unpickedItems.some((i) => i.id === pickerId)
                        ? pickerId
                        : unpickedItems[0]!.id
                    }
                    onChange={(e) => setPickerId(e.target.value)}
                    disabled={submitting}
                    className="h-10 w-full rounded-control border border-border bg-white px-3 text-sm text-text"
                  >
                    {unpickedItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.quantity_available} available)
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="button" variant="secondary" onClick={addLine} disabled={submitting}>
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  <span>Add item</span>
                </Button>
              </div>
            ) : catalog.length === 0 ? (
              <Alert tone="warning">No equipment items are currently available to borrow.</Alert>
            ) : null}
          </Card>

          <Card title="2. Reason & duration">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="purpose-category" className="mb-1 block text-sm font-medium text-text">
                  Purpose category
                </label>
                <select
                  id="purpose-category"
                  value={purposeCategory}
                  onChange={(e) => setPurposeCategory(e.target.value as PurposeCategory)}
                  disabled={submitting}
                  className="h-11 w-full rounded-control border border-border bg-white px-3 text-sm text-text"
                >
                  {PURPOSE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="requested-days" className="mb-1 block text-sm font-medium text-text">
                  Borrowing duration (days)
                </label>
                <input
                  id="requested-days"
                  type="number"
                  min={1}
                  max={14}
                  step={1}
                  value={requestedDays}
                  onChange={(e) => {
                    setRequestedDays(e.target.value);
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.requestedDays;
                      return next;
                    });
                  }}
                  disabled={submitting}
                  className="h-11 w-full rounded-control border border-border bg-white px-3 text-sm text-text"
                />
                <p className="mt-1 text-xs text-text-muted">Allowed duration: 1 to 14 calendar days.</p>
                {fieldErrors.requestedDays ? (
                  <p className="mt-1 text-xs text-danger">{fieldErrors.requestedDays}</p>
                ) : null}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="purpose-detail" className="mb-1 block text-sm font-medium text-text">
                  Purpose details {purposeCategory === "OTHER" ? "(required)" : "(course / project / lab note)"}
                </label>
                <textarea
                  id="purpose-detail"
                  rows={3}
                  maxLength={500}
                  value={purposeDetail}
                  onChange={(e) => {
                    setPurposeDetail(e.target.value);
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.purposeDetail;
                      return next;
                    });
                  }}
                  placeholder="e.g., CPE332 Senior Project prototype testing in Lab 4"
                  disabled={submitting}
                  className="w-full rounded-control border border-border bg-white px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-primary"
                />
                {fieldErrors.purposeDetail ? (
                  <p className="mt-1 text-xs text-danger">{fieldErrors.purposeDetail}</p>
                ) : null}
              </div>
            </div>
          </Card>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={submitting}>
              {submitting ? "Submitting…" : lines.length > 1 ? `Submit bundle request (${lines.length} items)` : "Submit request"}
            </Button>
            <Button variant="secondary" disabled={submitting} onClick={() => navigate("/catalog")}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
