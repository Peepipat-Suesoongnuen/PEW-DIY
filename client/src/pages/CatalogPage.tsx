import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Plus, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  api,
  ApiError,
  type CatalogSort,
  type Equipment,
} from "../lib/api";
import { itemPath, newRequestPath } from "../lib/paths";
import { useSession, useUnauthorizedRedirect } from "../lib/session";
import { Alert } from "../components/Alert";
import { AvailabilityBadge, QuantityDisplay } from "../components/AvailabilityBadge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { EquipmentImage } from "../components/EquipmentImage";
import { Field } from "../components/Field";
import { ItemCard } from "../components/ItemCard";
import { Loading } from "../components/Loading";
import { Pagination, usePagination } from "../components/Pagination";
import { CatalogStatusBadge } from "../components/StatusBadge";
import { Table, Th } from "../components/Table";

export function CatalogPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const onUnauthorized = useUnauthorizedRedirect();
  const isCustodian = user?.role === "CUSTODIAN";

  const [items, setItems] = useState<Equipment[] | null>(null);
  const [knownCategories, setKnownCategories] = useState<string[]>([]);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);

  // Search / filter / sort controls (FR-10)
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [availability, setAvailability] = useState<"" | "AVAILABLE" | "UNAVAILABLE">("");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "RETIRED" | "ALL">("ACTIVE");
  const [sort, setSort] = useState<CatalogSort>("name_asc");
  const pagination = usePagination(items ?? [], 10);
  const { setPage: setCatalogPage } = pagination;

  useEffect(() => {
    setCatalogPage(1);
  }, [query, category, availability, statusFilter, sort, setCatalogPage]);

  // Custodian Add Equipment form state (FR-09)
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++fetchSeq.current;
    setError(null);
    try {
      const res = await api.listEquipment({
        q: query.trim() || undefined,
        category: category || undefined,
        availability: availability || undefined,
        status: isCustodian ? statusFilter : undefined,
        sort: sort !== "name_asc" ? sort : undefined,
      });
      if (seq !== fetchSeq.current) return;
      setItems(res.data);
      setKnownCategories((prev) => {
        const merged = new Set(prev);
        for (const item of res.data) {
          if (item.category) merged.add(item.category);
        }
        return [...merged].sort((a, b) => a.localeCompare(b));
      });
    } catch (cause) {
      if (seq !== fetchSeq.current) return;
      if (onUnauthorized(cause)) return;
      setError({
        message: "Something went wrong. Please try again.",
        requestId: cause instanceof ApiError ? cause.requestId : undefined,
      });
      setItems(null);
    }
  }, [availability, category, isCustodian, onUnauthorized, query, sort, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(() => {
    const merged = new Set(knownCategories);
    if (category) merged.add(category);
    if (items) {
      for (const item of items) {
        if (item.category) merged.add(item.category);
      }
    }
    return [...merged].sort((a, b) => a.localeCompare(b));
  }, [category, items, knownCategories]);

  const hasActiveFilters = Boolean(
    query.trim() || category || availability || (isCustodian && statusFilter !== "ACTIVE"),
  );

  function resetCreateForm() {
    setNewName("");
    setNewCategory("");
    setNewDescription("");
    setNewQuantity("1");
    setNewImageUrl("");
    setCreateError(null);
  }

  async function handleCreateEquipment(event: FormEvent) {
    event.preventDefault();
    const total = Number(newQuantity);
    if (!newName.trim() || !newCategory.trim()) {
      setCreateError("Name and category are required.");
      return;
    }
    if (!Number.isSafeInteger(total) || total < 0) {
      setCreateError("Total quantity must be a whole number (0 or greater).");
      return;
    }
    setCreateError(null);
    setCreating(true);
    try {
      const created = await api.createEquipment({
        name: newName.trim(),
        category: newCategory.trim(),
        description: newDescription.trim(),
        quantity_total: total,
        image_url: newImageUrl.trim() || undefined,
      });
      setKnownCategories((prev) =>
        [...new Set([...prev, created.data.category])].sort((a, b) => a.localeCompare(b)),
      );
      setShowCreate(false);
      resetCreateForm();
      await load();
    } catch (cause) {
      if (onUnauthorized(cause)) return;
      setCreateError(cause instanceof ApiError ? cause.message : "Could not add equipment.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">Equipment Catalog</h1>
          <p className="mt-0.5 text-sm text-text-muted">
            Select any row or card to inspect full item details.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user?.role === "BORROWER" ? (
            <Link
              to={newRequestPath()}
              className="inline-flex items-center gap-2 rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              <span>Create request</span>
            </Link>
          ) : null}
          {isCustodian ? (
            <Button
              variant={showCreate ? "secondary" : "primary"}
              onClick={() => {
                setShowCreate((prev) => !prev);
                resetCreateForm();
              }}
            >
              {showCreate ? "Close form" : "Add equipment"}
            </Button>
          ) : null}
        </div>
      </div>

      {isCustodian && showCreate ? (
        <Card title="Add catalog equipment">
          {createError ? <div className="mb-3"><Alert tone="danger">{createError}</Alert></div> : null}
          <form onSubmit={handleCreateEquipment} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Field
                id="create-eq-name"
                label="Equipment name"
                value={newName}
                maxLength={120}
                onChange={(e) => setNewName(e.target.value)}
                required
                disabled={creating}
              />
              <p className="mt-1 text-right text-xs tabular-nums text-text-muted">{newName.length} / 120</p>
            </div>
            <div>
              <Field
                id="create-eq-category"
                label="Equipment category"
                value={newCategory}
                maxLength={60}
                onChange={(e) => setNewCategory(e.target.value)}
                required
                disabled={creating}
              />
              <p className="mt-1 text-right text-xs tabular-nums text-text-muted">{newCategory.length} / 60</p>
            </div>
            <div className="sm:col-span-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <label htmlFor="create-eq-desc" className="block text-sm font-medium text-text">
                  Description
                </label>
                <span className="text-xs tabular-nums text-text-muted">
                  {newDescription.length.toLocaleString()} / 1,000
                </span>
              </div>
              <textarea
                id="create-eq-desc"
                rows={2}
                maxLength={1000}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                disabled={creating}
                className="w-full rounded-control border border-border bg-white px-3 py-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-primary"
              />
            </div>
            <Field
              id="create-eq-qty"
              label="Total stock quantity (whole number >= 0)"
              type="number"
              min={0}
              step={1}
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              required
              disabled={creating}
            />
            <Field
              id="create-eq-img"
              label="Preview image URL (optional)"
              type="text"
              placeholder="https://... or /images/..."
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              disabled={creating}
            />
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" loading={creating}>
                {creating ? "Saving…" : "Save equipment"}
              </Button>
              <Button
                variant="secondary"
                disabled={creating}
                onClick={() => {
                  setShowCreate(false);
                  resetCreateForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-3 rounded-card border border-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label htmlFor="catalog-search" className="mb-1 block text-xs font-medium text-text-muted">
            Search
          </label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-text-muted" />
            <input
              id="catalog-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, description, or category…"
              className="h-10 w-full rounded-control border border-border bg-white pl-9 pr-3 text-sm text-text focus-visible:outline-2 focus-visible:outline-primary"
            />
          </div>
        </div>

        <div>
          <label htmlFor="catalog-category" className="mb-1 block text-xs font-medium text-text-muted">
            Category
          </label>
          <select
            id="catalog-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 w-full rounded-control border border-border bg-white px-3 text-sm text-text focus-visible:outline-2 focus-visible:outline-primary"
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="catalog-availability" className="mb-1 block text-xs font-medium text-text-muted">
            Availability
          </label>
          <select
            id="catalog-availability"
            value={availability}
            onChange={(e) => setAvailability(e.target.value as "" | "AVAILABLE" | "UNAVAILABLE")}
            className="h-10 w-full rounded-control border border-border bg-white px-3 text-sm text-text focus-visible:outline-2 focus-visible:outline-primary"
          >
            <option value="">All availability</option>
            <option value="AVAILABLE">Available only</option>
            <option value="UNAVAILABLE">Unavailable only</option>
          </select>
        </div>

        <div>
          <label htmlFor="catalog-sort" className="mb-1 block text-xs font-medium text-text-muted">
            Sort by
          </label>
          <select
            id="catalog-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as CatalogSort)}
            className="h-10 w-full rounded-control border border-border bg-white px-3 text-sm text-text focus-visible:outline-2 focus-visible:outline-primary"
          >
            <option value="name_asc">Name (A–Z)</option>
            <option value="name_desc">Name (Z–A)</option>
            <option value="available_desc">Most available</option>
            <option value="available_asc">Least available</option>
          </select>
        </div>

        {isCustodian ? (
          <div className="sm:col-span-2 lg:col-span-5 flex items-center gap-2 pt-1">
            <label htmlFor="catalog-status" className="text-xs font-medium text-text-muted">
              Catalog status:
            </label>
            <select
              id="catalog-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "ACTIVE" | "RETIRED" | "ALL")}
              className="h-9 rounded-control border border-border bg-white px-2.5 text-sm text-text"
            >
              <option value="ACTIVE">Active items</option>
              <option value="RETIRED">Retired items</option>
              <option value="ALL">All statuses</option>
            </select>
          </div>
        ) : null}
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
        <Loading label="Loading catalog…" />
      ) : items.length === 0 ? (
        <EmptyState
          message={
            hasActiveFilters
              ? "No equipment matched your filters."
              : "The catalog has no items yet."
          }
          action={
            hasActiveFilters ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setCategory("");
                  setAvailability("");
                  setStatusFilter("ACTIVE");
                  setSort("name_asc");
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Table
              header={
                <tr>
                  <Th className="w-[10%]">Item</Th>
                  <Th className="w-[50%] lg:w-[34%]">Name</Th>
                  <Th className="hidden w-[16%] lg:table-cell">Category</Th>
                  <Th className="w-[22%]">Availability</Th>
                  <Th className="w-[18%]">Quantity</Th>
                </tr>
              }
            >
              {pagination.pageItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => navigate(itemPath(item.id))}
                  title="Click row to open equipment details"
                  className="cursor-pointer transition-colors hover:bg-primary/5"
                >
                  <td className="px-4 py-3">
                    <EquipmentImage
                      imageUrl={item.image_url}
                      name={item.name}
                      category={item.category}
                      size="sm"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-text">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={itemPath(item.id)}
                        aria-label={`View ${item.name}`}
                        onClick={(e) => e.stopPropagation()}
                        className="truncate text-primary hover:underline"
                      >
                        {item.name}
                      </Link>
                      {item.catalog_status === "RETIRED" ? (
                        <CatalogStatusBadge status={item.catalog_status} />
                      ) : null}
                    </div>
                  </td>
                  <td className="hidden truncate px-4 py-3 text-text-muted lg:table-cell">{item.category}</td>
                  <td className="px-4 py-3">
                    <AvailabilityBadge availability={item.availability} />
                  </td>
                  <td className="px-4 py-3 text-text">
                    <QuantityDisplay available={item.quantity_available} total={item.quantity_total} />
                  </td>
                </tr>
              ))}
            </Table>
          </div>

          <div className="grid grid-cols-1 gap-3 md:hidden">
            {pagination.pageItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>

          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </>
      )}
    </div>
  );
}
