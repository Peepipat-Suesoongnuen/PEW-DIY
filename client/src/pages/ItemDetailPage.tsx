import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError, type CatalogStatus, type Equipment } from "../lib/api";
import { newRequestPath, useItemRouteId } from "../lib/paths";
import { useSession, useUnauthorizedRedirect } from "../lib/session";
import { Alert } from "../components/Alert";
import { AvailabilityBadge, QuantityDisplay } from "../components/AvailabilityBadge";
import { BackButton } from "../components/BackButton";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { EquipmentImage } from "../components/EquipmentImage";
import { Field } from "../components/Field";
import { Loading } from "../components/Loading";
import { CatalogStatusBadge } from "../components/StatusBadge";

function LabeledBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-control border border-border bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <div className="mt-1.5 text-sm text-text [overflow-wrap:anywhere]">{children}</div>
    </div>
  );
}

/**
 * Equipment Detail Page (F-02 / F-08 / UAT-07):
 * - Clearly separated boxes for Image, Description, Category, Quantity & Status.
 * - Borrowers use RequestToBorrow on ACTIVE items (retired items show retired notice).
 * - Custodians can edit equipment attributes or retire/reactivate catalog items.
 */
export function ItemDetailPage() {
  const { user } = useSession();
  const id = useItemRouteId();
  const onUnauthorized = useUnauthorizedRedirect();
  const isCustodian = user?.role === "CUSTODIAN";

  const [item, setItem] = useState<Equipment | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);

  // Custodian Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTotal, setEditTotal] = useState("0");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editStatus, setEditStatus] = useState<CatalogStatus>("ACTIVE");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchSeq = useRef(0);

  const syncForm = (eq: Equipment) => {
    setEditName(eq.name);
    setEditCategory(eq.category);
    setEditDescription(eq.description);
    setEditTotal(String(eq.quantity_total));
    setEditImageUrl(eq.image_url ?? "");
    setEditStatus(eq.catalog_status ?? "ACTIVE");
  };

  const load = useCallback(async () => {
    const seq = ++fetchSeq.current;
    if (!id) {
      setItem(null);
      setNotFound(true);
      return;
    }
    setItem(null);
    setError(null);
    setNotFound(false);
    try {
      const res = await api.getEquipment(id);
      if (seq !== fetchSeq.current) return;
      setItem(res.data);
      syncForm(res.data);
    } catch (cause) {
      if (seq !== fetchSeq.current) return;
      if (onUnauthorized(cause)) return;
      if (cause instanceof ApiError && cause.status === 404) {
        setNotFound(true);
        return;
      }
      setError({
        message: "Something went wrong. Please try again.",
        requestId: cause instanceof ApiError ? cause.requestId : "n/a",
      });
    }
  }, [id, onUnauthorized]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!item) return;
    const total = Number(editTotal);
    const held = item.quantity_total - item.quantity_available;
    if (!editName.trim() || !editCategory.trim()) {
      setSaveError("Name and category are required.");
      return;
    }
    if (!Number.isSafeInteger(total) || total < held) {
      setSaveError(`Enter a whole number >= ${held} (currently held by active loans).`);
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      const updated = await api.updateEquipment(item.id, {
        name: editName.trim(),
        category: editCategory.trim(),
        description: editDescription.trim(),
        quantity_total: total,
        image_url: editImageUrl.trim(),
        catalog_status: editStatus,
      });
      setItem(updated.data);
      syncForm(updated.data);
      setEditing(false);
    } catch (cause) {
      if (onUnauthorized(cause)) return;
      setSaveError(cause instanceof ApiError ? cause.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  const catalogStatus: CatalogStatus = item?.catalog_status ?? "ACTIVE";

  return (
    <div className="space-y-6">
      <BackButton to="/catalog" label="Back to catalog" />

      {notFound ? (
        <EmptyState
          message="Item not found."
          action={
            <Link to="/catalog" className="text-primary underline">
              Back to catalog
            </Link>
          }
        />
      ) : error ? (
        <div className="space-y-4">
          <Alert tone="danger" requestId={error.requestId}>
            {error.message}
          </Alert>
          <Button variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : !item ? (
        <Loading label="Loading item…" />
      ) : (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <EquipmentImage
                imageUrl={item.image_url}
                name={item.name}
                category={item.category}
                size="lg"
              />
              <div className="min-w-0 flex-1 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h1 className="min-w-0 text-xl font-semibold text-text [overflow-wrap:anywhere]">{item.name}</h1>
                  <div className="flex items-center gap-2">
                    <AvailabilityBadge availability={item.availability} />
                    <CatalogStatusBadge status={catalogStatus} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <LabeledBox label="Category">{item.category}</LabeledBox>
                  <LabeledBox label="Quantity">
                    <QuantityDisplay available={item.quantity_available} total={item.quantity_total} />
                  </LabeledBox>
                  <div className="sm:col-span-2">
                    <LabeledBox label="Description">
                      {item.description || <span className="text-text-muted">No description</span>}
                    </LabeledBox>
                  </div>
                  <LabeledBox label="Borrowing window">1 to 14 calendar days (selected on request form)</LabeledBox>
                  <LabeledBox label="Catalog status">
                    {catalogStatus === "ACTIVE" ? "Active (open for requests)" : "Retired"}
                  </LabeledBox>
                </div>

                {user?.role === "BORROWER" ? (
                  <div className="border-t border-border pt-4">
                    {catalogStatus === "RETIRED" ? (
                      <Alert tone="info">This equipment has been retired and is no longer available to borrow.</Alert>
                    ) : item.quantity_available < 1 ? (
                      <Alert tone="warning">
                        Currently out of stock. Check back once an active loan is returned.
                      </Alert>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3">
                        <Link
                          to={newRequestPath(item.id)}
                          className="inline-flex items-center justify-center rounded-control bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
                        >
                          Request this item
                        </Link>
                        <p className="text-xs text-text-muted">
                          Requests do not reserve equipment. You can combine multiple items and choose 1–14 days on the request form.
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}

                {isCustodian ? (
                  <div className="border-t border-border pt-4">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        syncForm(item);
                        setEditing((v) => !v);
                        setSaveError(null);
                      }}
                    >
                      {editing ? "Close editor" : "Edit equipment"}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </Card>

          {isCustodian && editing ? (
            <Card title="Edit equipment details">
              {saveError ? <div className="mb-3"><Alert tone="danger">{saveError}</Alert></div> : null}
              <form onSubmit={handleSave} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Field
                    id="edit-eq-name"
                    label="Equipment name"
                    value={editName}
                    maxLength={120}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    disabled={saving}
                  />
                  <p className="mt-1 text-right text-xs tabular-nums text-text-muted">{editName.length} / 120</p>
                </div>
                <div>
                  <Field
                    id="edit-eq-category"
                    label="Category"
                    value={editCategory}
                    maxLength={60}
                    onChange={(e) => setEditCategory(e.target.value)}
                    required
                    disabled={saving}
                  />
                  <p className="mt-1 text-right text-xs tabular-nums text-text-muted">{editCategory.length} / 60</p>
                </div>
                <div className="sm:col-span-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <label htmlFor="edit-eq-desc" className="block text-sm font-medium text-text">
                      Description
                    </label>
                    <span className="text-xs tabular-nums text-text-muted">
                      {editDescription.length.toLocaleString()} / 1,000
                    </span>
                  </div>
                  <textarea
                    id="edit-eq-desc"
                    rows={3}
                    maxLength={1000}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    disabled={saving}
                    className="w-full rounded-control border border-border bg-white px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-primary"
                  />
                </div>
                <Field
                  id="edit-eq-qty"
                  label={`Total stock quantity (min ${item.quantity_total - item.quantity_available} currently held)`}
                  type="number"
                  min={item.quantity_total - item.quantity_available}
                  step={1}
                  value={editTotal}
                  onChange={(e) => setEditTotal(e.target.value)}
                  required
                  disabled={saving}
                />
                <Field
                  id="edit-eq-img"
                  label="Preview image URL"
                  type="text"
                  placeholder="https://... or /images/..."
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  disabled={saving}
                />
                <div>
                  <label htmlFor="edit-eq-status" className="mb-1 block text-sm font-medium text-text">
                    Catalog status
                  </label>
                  <select
                    id="edit-eq-status"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as CatalogStatus)}
                    disabled={saving}
                    className="h-11 w-full rounded-control border border-border bg-white px-3 text-sm text-text"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="RETIRED">Retired</option>
                  </select>
                </div>
                <div className="flex items-end gap-2 sm:col-span-2">
                  <Button type="submit" loading={saving}>
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={saving}
                    onClick={() => {
                      syncForm(item);
                      setEditing(false);
                      setSaveError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
