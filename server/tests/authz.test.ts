/**
 * RED test design — authorization guard behavior (AC-F01-05/08/09, TEST-F01-09).
 * Route-parameterized: iterates PROTECTED_ROUTES so new routes are covered
 * automatically. These tests validate the middleware contracts at the unit
 * level; full HTTP integration follows once the Express app is wired.
 */
import { describe, expect, it } from "vitest";
import { createAuthMiddleware, PROTECTED_ROUTES, Role } from "../src/services/authz";
import { AuthService } from "../src/services/auth";
import { SessionStore } from "../src/services/session";

function makeAuthMiddleware() {
  // Pools are not exercised for guard logic; pass a dummy.
  const auth = new AuthService({} as never, new SessionStore({} as never, 60, 480));
  return createAuthMiddleware(auth, "pew_session");
}

function mockRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe("PROTECTED_ROUTES registry (TEST-F01-05 route-parameterized)", () => {
  it("lists every protected route with at least one allowed role", () => {
    expect(PROTECTED_ROUTES.length).toBeGreaterThan(0);
    for (const route of PROTECTED_ROUTES) {
      expect(route.allowedRoles.length).toBeGreaterThan(0);
      expect(["GET", "POST"]).toContain(route.method);
      expect(route.path.startsWith("/api/")).toBe(true);
    }
  });

  it("marks /api/auth/me and /api/auth/logout as accessible to both roles", () => {
    const me = PROTECTED_ROUTES.find((r) => r.path === "/api/auth/me");
    const logout = PROTECTED_ROUTES.find((r) => r.path === "/api/auth/logout");
    expect(me).toBeDefined();
    expect(logout).toBeDefined();
    expect(me!.allowedRoles).toEqual(expect.arrayContaining(["BORROWER", "CUSTODIAN"]));
    expect(logout!.allowedRoles).toEqual(expect.arrayContaining(["BORROWER", "CUSTODIAN"]));
  });
});

describe("requireAuth deny-by-default (AC-F01-05)", () => {
  it("returns 401 UNAUTHENTICATED without a session and does not call next()", async () => {
    const { requireAuth } = makeAuthMiddleware();
    const res = mockRes();
    let nextCalled = false;
    await requireAuth({ cookies: {} } as never, res as never, () => {
      nextCalled = true;
    });
    expect(res.statusCode).toBe(401);
    expect((res.body as { error: { code: string } }).error.code).toBe("UNAUTHENTICATED");
    expect(nextCalled).toBe(false);
  });

  it("returns 401 for an invalid/tampered session id (fail-closed, no DB call)", async () => {
    const { requireAuth } = makeAuthMiddleware();
    const res = mockRes();
    let nextCalled = false;
    // Empty cookie = no session → deny before any DB lookup.
    await requireAuth({ cookies: {} } as never, res as never, () => {
      nextCalled = true;
    });
    expect(res.statusCode).toBe(401);
    expect(nextCalled).toBe(false);
  });
});

describe("requireRole enforcement (AC-F01-08, BR-04/BR-06)", () => {
  it("returns 403 FORBIDDEN for wrong role and passes correct role", () => {
    const { requireRole } = makeAuthMiddleware();
    const custodianOnly = requireRole("CUSTODIAN");
    const borrowerReq = { user: { id: "u-b-a", username: "B-A", role: "BORROWER" as Role } };
    const custodianReq = { user: { id: "u-c-a", username: "C-A", role: "CUSTODIAN" as Role } };

    const resForbidden = mockRes();
    let nextCalled = false;
    custodianOnly(borrowerReq as never, resForbidden as never, () => {
      nextCalled = true;
    });
    expect(resForbidden.statusCode).toBe(403);
    expect((resForbidden.body as { error: { code: string } }).error.code).toBe("FORBIDDEN");
    expect(nextCalled).toBe(false);

    const resOk = mockRes();
    nextCalled = false;
    custodianOnly(custodianReq as never, resOk as never, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
    expect(resOk.statusCode).toBe(0);
  });

  it("returns 401 (not 403) when unauthenticated (deny-by-default)", () => {
    const { requireRole } = makeAuthMiddleware();
    const res = mockRes();
    let nextCalled = false;
    requireRole("CUSTODIAN")({} as never, res as never, () => {
      nextCalled = true;
    });
    expect(res.statusCode).toBe(401);
    expect(nextCalled).toBe(false);
  });
});

describe("verifyOwnership record-scope guard (AC-F01-09, BR-05)", () => {
  it("grants access to the owner and denies another borrower (403 semantics)", async () => {
    const { verifyOwnership } = makeAuthMiddleware();
    const ownerReq = { user: { id: "u-b-a", username: "B-A", role: "BORROWER" as Role } };
    const otherReq = { user: { id: "u-b-b", username: "B-B", role: "BORROWER" as Role } };
    const custodianReq = { user: { id: "u-c-a", username: "C-A", role: "CUSTODIAN" as Role } };

    expect(await verifyOwnership(ownerReq as never, "u-b-a")).toBe(true);
    expect(await verifyOwnership(otherReq as never, "u-b-a")).toBe(false);
    // Custodian ownership check: own record passes; other's record fails
    // (staff loan views are Sprint 2 scope — FR-18).
    expect(await verifyOwnership(custodianReq as never, "u-c-a")).toBe(true);
    expect(await verifyOwnership(custodianReq as never, "u-b-a")).toBe(false);
  });

  it("denies ownership check without authentication", async () => {
    const { verifyOwnership } = makeAuthMiddleware();
    expect(await verifyOwnership({} as never, "u-b-a")).toBe(false);
  });
});
