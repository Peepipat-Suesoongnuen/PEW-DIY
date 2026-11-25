import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

export interface PaginationResult<T> {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  pageItems: T[];
  setPage: (next: number) => void;
  setPageSize: (next: number) => void;
}

/** Slice a client-side list into pages and keep the current page clamped inside valid bounds. */
export function usePagination<T>(items: readonly T[], defaultPageSize = 10): PaginationResult<T> {
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    if (page !== safePage) {
      setPageState(safePage);
    }
  }, [page, safePage]);

  const setPage = useCallback(
    (next: number) => {
      setPageState(Math.min(Math.max(1, next), totalPages));
    },
    [totalPages],
  );

  const setPageSize = useCallback((next: number) => {
    setPageSizeState(next > 0 ? next : defaultPageSize);
    setPageState(1);
  }, [defaultPageSize]);

  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(totalItems, startIndex + pageSize);

  const pageItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex],
  );

  return {
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    pageItems,
    setPage,
    setPageSize,
  };
}

function buildPageTokens(current: number, total: number): Array<number | "ellipsis-left" | "ellipsis-right"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, idx) => idx + 1);
  }
  const tokens: Array<number | "ellipsis-left" | "ellipsis-right"> = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) tokens.push("ellipsis-left");
  for (let p = left; p <= right; p += 1) tokens.push(p);
  if (right < total - 1) tokens.push("ellipsis-right");
  tokens.push(total);
  return tokens;
}

export function Pagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: readonly number[];
}) {
  if (totalItems === 0) return null;

  const startDisp = (page - 1) * pageSize + 1;
  const endDisp = Math.min(totalItems, page * pageSize);
  const tokens = buildPageTokens(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-white px-4 py-2.5 text-xs text-text-muted">
      <div className="flex flex-wrap items-center gap-3">
        <span className="tabular-nums">
          Showing {startDisp}–{endDisp} of {totalItems}
        </span>
        <label className="inline-flex items-center gap-1.5">
          <span>Rows per page</span>
          <select
            aria-label="Rows per page"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 rounded-control border border-border bg-white px-2 text-xs text-text focus-visible:outline-2 focus-visible:outline-primary"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
      </div>

      <nav aria-label="Table pagination" className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-8 items-center gap-1 rounded-control border border-border bg-white px-2.5 text-xs font-medium text-text hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        {tokens.map((tok) =>
          typeof tok === "string" ? (
            <span key={tok} className="px-1.5 text-text-muted" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={tok}
              type="button"
              aria-label={`Page ${tok}`}
              aria-current={tok === page ? "page" : undefined}
              onClick={() => onPageChange(tok)}
              className={`h-8 min-w-8 rounded-control border px-2 text-xs tabular-nums transition-colors ${
                tok === page
                  ? "border-primary bg-primary font-medium text-white"
                  : "border-border bg-white text-text hover:bg-primary/5"
              }`}
            >
              {tok}
            </button>
          ),
        )}

        <button
          type="button"
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-8 items-center gap-1 rounded-control border border-border bg-white px-2.5 text-xs font-medium text-text hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      </nav>
    </div>
  );
}
