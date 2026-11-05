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
  listEquipment() {
    return apiFetch<{ data: Equipment[] }>("/api/equipment");
  },
  getEquipment(id: string) {
    return apiFetch<{ data: Equipment }>(`/api/equipment/${encodeURIComponent(id)}`);
  },
};
