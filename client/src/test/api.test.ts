import { afterEach, describe, expect, it, vi } from "vitest";
import { api, apiFetch, ApiError } from "../lib/api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api client (safe error mapping — shared-conventions)", () => {
  it("maps the JSON error envelope to ApiError with code and requestId", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "Resource not found.", requestId: "req-1" } }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const err = await api.getEquipment("missing").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(404);
    expect((err as ApiError).code).toBe("NOT_FOUND");
    expect((err as ApiError).requestId).toBe("req-1");
  });

  it("never surfaces raw non-JSON error bodies (proxy error pages)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>Internal SQL error: table users</html>", { status: 500 })),
    );
    const err = await api.listEquipment().catch((e: unknown) => e);
    expect((err as ApiError).message).toBe("Something went wrong. Please try again.");
    expect((err as ApiError).message).not.toContain("SQL");
  });

  it("maps network failures to a safe NETWORK_ERROR (uncertain outcome)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    const err = await apiFetch("/api/equipment").catch((e: unknown) => e);
    expect((err as ApiError).code).toBe("NETWORK_ERROR");
    expect((err as ApiError).status).toBe(0);
  });

  it("returns the data envelope for successful reads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ data: { user: { id: "u1", username: "C-A", role: "CUSTODIAN" } } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const res = await api.me();
    expect(res.data.user.username).toBe("C-A");
    expect(res.data.user.role).toBe("CUSTODIAN");
  });
});
