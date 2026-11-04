/**
 * Authorization guard — deny-by-default, role and record-scope enforcement
 * (contract §2.2, SDS §6.2, AC-F01-04/05/08/09).
 *
 * Every protected route must resolve the authenticated principal from trusted
 * server state and apply role/ownership checks before returning data or
 * executing writes. A hidden UI control is NOT authorization.
 */
import type { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth";
import { SessionUser } from "../services/session";

export interface AuthenticatedRequest extends Request {
  user?: SessionUser;
}

export type Role = "BORROWER" | "CUSTODIAN";

/**
 * Protected route registry — TEST-F01-05/06/09 iterate this inventory so new
 * routes are automatically covered (contract §2.2: "Expand the
 * route-parameterized tests whenever a protected route is added").
 */
export const PROTECTED_ROUTES: ReadonlyArray<{
  method: "GET" | "POST";
  path: string;
  allowedRoles: ReadonlyArray<Role>;
}> = [
  { method: "GET", path: "/api/auth/me", allowedRoles: ["BORROWER", "CUSTODIAN"] },
  { method: "POST", path: "/api/auth/logout", allowedRoles: ["BORROWER", "CUSTODIAN"] },
];

export function createAuthMiddleware(auth: AuthService, cookieName: string) {
  /** Deny-by-default authentication guard (AC-F01-05). */
  async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const rawSessionId = req.cookies?.[cookieName] as string | undefined;
    const user = await auth.currentUser(rawSessionId);
    if (!user) {
      res.status(401).json({
        error: { code: "UNAUTHENTICATED", message: "Authentication required.", requestId: req.requestId },
      });
      return;
    }
    req.user = user;
    next();
  }

  /** Role guard (AC-F01-08, BR-04/BR-06). */
  function requireRole(...allowed: Role[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          error: { code: "UNAUTHENTICATED", message: "Authentication required.", requestId: req.requestId },
        });
        return;
      }
      if (!allowed.includes(req.user.role)) {
        res.status(403).json({
          error: { code: "FORBIDDEN", message: "Access denied.", requestId: req.requestId },
        });
        return;
      }
      next();
    };
  }

  /**
   * Ownership guard for record-scope queries (AC-F01-09, BR-05).
   * Verifies the caller owns the target record before returning it; another
   * borrower's existing record yields 403 (not 404 — existence is not leaked).
   */
  async function verifyOwnership(
    req: AuthenticatedRequest,
    recordOwnerId: string,
  ): Promise<boolean> {
    return req.user?.id === recordOwnerId;
  }

  return { requireAuth, requireRole, verifyOwnership };
}

declare module "express-serve-static-core" {
  interface Request {
    requestId?: string;
  }
}
