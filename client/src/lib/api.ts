/**
 * Typed API client for the existing F-01/F-02 contracts (shared-conventions).
 * Contract shapes are read-only here — UI-02 must not change any API contract:
 *   POST /api/auth/login  -> 200 { data: { user } } | 401 INVALID_CREDENTIALS
 *   GET  /api/auth/me     -> 200 { data: { user } } | 401 UNAUTHENTICATED
 *   POST /api/auth/logout -> 204 | 401 | 500
 *   GET  /api/equipment   -> 200 { data: Equipment[] } | 401 | 503
 *   GET  /api/equipment/:id -> 200 { data: Equipment } | 404 NOT_FOUND | 401
 * Error envelope (all routes): { error: { code, message, requestId } }.
 */

export type Role = "BORROWER" | "CUSTODIAN";
export type CatalogStatus = "ACTIVE" | "RETIRED";
export type CatalogSort = "name_asc" | "name_desc" | "available_desc" | "available_asc";
export type PurposeCategory =
  | "COURSE_PROJECT"
  | "CAPSTONE"
  | "LAB_RESEARCH"
  | "PERSONAL_CLUB"
  | "OTHER";

export const PURPOSE_CATEGORIES: ReadonlyArray<{ value: PurposeCategory; label: string }> = [
  { value: "COURSE_PROJECT", label: "Coursework / Lab Project" },
  { value: "CAPSTONE", label: "Senior / Capstone Project" },
  { value: "LAB_RESEARCH", label: "Lab / Research" },
  { value: "PERSONAL_CLUB", label: "Student Club / Activity" },
  { value: "OTHER", label: "Other" },
];

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type RequestStatus = "SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "CHECKED_OUT";
export type LoanStatus = "ACTIVE" | "RETURN_PENDING" | "RETURNED";
export type LoanScope = "active" | "history" | "all";

export interface User {
  id: string;
  username: string;
  role: Role;
}

export interface Equipment {
  id: string;
  name: string;
  description: string;
  category: string;
  quantity_total: number;
  quantity_available: number;
  availability: "AVAILABLE" | "UNAVAILABLE";
  image_url?: string;
  catalog_status?: CatalogStatus;
}

export interface CatalogQuery {
  q?: string;
  category?: string;
  availability?: "AVAILABLE" | "UNAVAILABLE";
  status?: CatalogStatus | "ALL";
  sort?: CatalogSort;
}

export interface BorrowingRequest {
  id: string;
  bundle_id?: string | null;
  borrower_id: string;
  borrower_username?: string;
  equipment_id: string;
  equipment_name?: string;
  quantity_requested: number;
  purpose_category?: PurposeCategory;
  purpose_detail?: string;
  requested_days?: number;
  approval_status?: ApprovalStatus;
  decision_note?: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  status: RequestStatus;
}

export interface Loan {
  id: string;
  request_id: string;
  bundle_id?: string | null;
  borrower_id: string;
  borrower_username?: string;
  equipment_id: string;
  equipment_name?: string;
  quantity_borrowed: number;
  requested_days?: number;
  checked_out_by: string;
  checkout_at: string;
  due_on: string;
  return_requested_at?: string | null;
  return_requested_by?: string | null;
  return_note?: string;
  returned_at?: string | null;
  returned_by?: string | null;
  status: LoanStatus;
  overdue?: boolean;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  let code = "INTERNAL_ERROR";
  let message = "Something went wrong. Please try again.";
  let requestId = "n/a";
  try {
    const body = (await res.json()) as {
      error?: { code?: string; message?: string; requestId?: string };
    };
    if (body && body.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
      requestId = body.error.requestId ?? requestId;
    }
  } catch {
    // Non-JSON body (e.g. proxy error page): keep the generic message —
    // never surface raw server text (shared-conventions, ui-spec §0.3).
  }
  return new ApiError(res.status, code, message, requestId);
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      credentials: "same-origin",
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
      ...init,
    });
  } catch {
    // Network failure: uncertain outcome — safe generic error (f-01 §2.3).
    throw new ApiError(0, "NETWORK_ERROR", "Something went wrong. Please try again.", "n/a");
  }
  if (!res.ok) {
    throw await toApiError(res);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export const api = {
  checkout(requestId: string) {
    return apiFetch<{ data: Loan }>(`/api/requests/${encodeURIComponent(requestId)}/checkout`, { method: "POST", body: "{}" });
  },
  checkoutBundle(bundleId: string) {
    return apiFetch<{ data: Loan[] }>(`/api/request-bundles/${encodeURIComponent(bundleId)}/checkout`, {
      method: "POST",
      body: "{}",
    });
  },
  listLoans(scope: LoanScope = "active") {
    return apiFetch<{ data: Loan[] }>(`/api/loans?scope=${encodeURIComponent(scope)}`);
  },
  getLoan(id: string) {
    return apiFetch<{ data: Loan }>(`/api/loans/${encodeURIComponent(id)}`);
  },
  requestReturn(loanId: string, return_note = "") {
    return apiFetch<{ data: Loan }>(`/api/loans/${encodeURIComponent(loanId)}/request-return`, {
      method: "POST",
      body: JSON.stringify(return_note ? { return_note } : {}),
    });
  },
  confirmReturn(loanId: string, return_note = "") {
    return apiFetch<{ data: Loan }>(`/api/loans/${encodeURIComponent(loanId)}/return`, {
      method: "POST",
      body: JSON.stringify(return_note ? { return_note } : {}),
    });
  },
  confirmBundleReturn(bundleId: string, return_note = "") {
    return apiFetch<{ data: Loan[] }>(`/api/loan-bundles/${encodeURIComponent(bundleId)}/return`, {
      method: "POST",
      body: JSON.stringify(return_note ? { return_note } : {}),
    });
  },
  login(username: string, password: string) {
    return apiFetch<{ data: { user: User } }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },
  me() {
    return apiFetch<{ data: { user: User } }>("/api/auth/me");
  },
  logout() {
    return apiFetch<void>("/api/auth/logout", { method: "POST" });
  },
  listEquipment(query?: CatalogQuery) {
    const params = new URLSearchParams();
    if (query?.q) params.set("q", query.q);
    if (query?.category) params.set("category", query.category);
    if (query?.availability) params.set("availability", query.availability);
    if (query?.status) params.set("status", query.status);
    if (query?.sort) params.set("sort", query.sort);
    const qs = params.toString();
    return apiFetch<{ data: Equipment[] }>(qs ? `/api/equipment?${qs}` : "/api/equipment");
  },
  getEquipment(id: string) {
    return apiFetch<{ data: Equipment }>(`/api/equipment/${encodeURIComponent(id)}`);
  },
  createEquipment(input: {
    name: string;
    description: string;
    category: string;
    quantity_total: number;
    image_url?: string;
  }) {
    return apiFetch<{ data: Equipment }>("/api/equipment", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  updateEquipment(
    id: string,
    input: {
      name?: string;
      description?: string;
      category?: string;
      quantity_total?: number;
      image_url?: string;
      catalog_status?: CatalogStatus;
    },
  ) {
    return apiFetch<{ data: Equipment }>(`/api/equipment/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
  createRequest(
    equipment_id: string,
    quantity_requested: number,
    options?: {
      purpose_category?: PurposeCategory;
      purpose_detail?: string;
      requested_days?: number;
    },
  ) {
    return apiFetch<{ data: BorrowingRequest }>("/api/requests", {
      method: "POST",
      body: JSON.stringify({
        equipment_id,
        quantity_requested,
        ...(options?.purpose_category ? { purpose_category: options.purpose_category } : {}),
        ...(options?.purpose_detail !== undefined ? { purpose_detail: options.purpose_detail } : {}),
        ...(options?.requested_days !== undefined ? { requested_days: options.requested_days } : {}),
      }),
    });
  },
  createRequestBundle(input: {
    items: Array<{ equipment_id: string; quantity_requested: number }>;
    purpose_category: PurposeCategory;
    purpose_detail: string;
    requested_days: number;
  }) {
    return apiFetch<{ data: { bundle_id: string; requests: BorrowingRequest[] } }>("/api/request-bundles", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  listRequests(filter?: { status?: string; q?: string }) {
    const params = new URLSearchParams();
    if (filter?.status) params.set("status", filter.status);
    if (filter?.q) params.set("q", filter.q);
    const qs = params.toString();
    return apiFetch<{ data: BorrowingRequest[] }>(qs ? `/api/requests?${qs}` : "/api/requests");
  },
  getRequest(id: string) {
    return apiFetch<{ data: BorrowingRequest }>(`/api/requests/${encodeURIComponent(id)}`);
  },
  approveRequest(id: string, decision_note = "") {
    return apiFetch<{ data: BorrowingRequest }>(`/api/requests/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      body: JSON.stringify(decision_note ? { decision_note } : {}),
    });
  },
  rejectRequest(id: string, decision_note = "") {
    return apiFetch<{ data: BorrowingRequest }>(`/api/requests/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      body: JSON.stringify(decision_note ? { decision_note } : {}),
    });
  },
  cancelRequest(id: string) {
    return apiFetch<{ data: BorrowingRequest }>(`/api/requests/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
      body: "{}",
    });
  },
  approveBundle(bundleId: string, decision_note = "") {
    return apiFetch<{ data: BorrowingRequest[] }>(`/api/request-bundles/${encodeURIComponent(bundleId)}/approve`, {
      method: "POST",
      body: JSON.stringify(decision_note ? { decision_note } : {}),
    });
  },
  rejectBundle(bundleId: string, decision_note = "") {
    return apiFetch<{ data: BorrowingRequest[] }>(`/api/request-bundles/${encodeURIComponent(bundleId)}/reject`, {
      method: "POST",
      body: JSON.stringify(decision_note ? { decision_note } : {}),
    });
  },
  cancelBundle(bundleId: string) {
    return apiFetch<{ data: BorrowingRequest[] }>(`/api/request-bundles/${encodeURIComponent(bundleId)}/cancel`, {
      method: "POST",
      body: "{}",
    });
  },
};
