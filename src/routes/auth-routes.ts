/**
 * HTTP routes — authentication endpoints (contract §3, shared-conventions).
 *
 * Cookie transport (D2: server session + HttpOnly cookie + CSRF-ready):
 * - SESSION_COOKIE_NAME cookie carries the raw session id; HttpOnly and
 *   Secure (deployed) attributes per SDS §7.2.
 * - Login sets the cookie only after successful session creation.
 * - Logout revokes server-side then clears the cookie; 204 on success.
 */
import express, { Request, Response, Router, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { randomUUID } from "crypto";
import { AuthService } from "../services/auth";
import { createAuthMiddleware, AuthenticatedRequest } from "../services/authz";
import { AppConfig } from "../config/config";

export interface AppDeps {
  auth: AuthService;
  config: AppConfig;
}

export function createApp({ auth, config }: AppDeps): express.Application {
  const app = express();

  // Request ID first so parser/guard failures also carry a correlation id
  // in their safe error envelope (PR #22 review, P2-2).
  app.use((req: Request, res: Response, next) => {
    req.requestId = randomUUID();
    next();
  });
  app.use(express.json({ limit: "10kb" }));
  app.use(cookieParser());

  const { requireAuth } = createAuthMiddleware(auth, config.session.cookieName);
  const router = Router();

  // Anti-CSRF: cookie mode enforces trusted-origin validation on
  // state-changing requests (AC-F01-12, TEST-F01-15; SDS §7.2). A hostile
  // cross-origin POST (e.g. forced logout) must be denied before handlers.
  // Evidence policy (review round 2): a state-changing request must carry
  // either a trusted Origin or a trusted Referer. Requests with neither are
  // DENIED (403) — absent evidence is not treated as safe. Non-browser
  // clients must send an explicit Origin header.
  function requireTrustedOrigin(req: Request, res: Response, next: NextFunction): void {
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
      next();
      return;
    }
    const deny = (): void => {
      res.status(403).json({
        error: { code: "FORBIDDEN", message: "Request origin not allowed.", requestId: req.requestId },
      });
    };
    const origin = req.headers.origin;
    if (typeof origin === "string") {
      if (origin !== config.appOrigin) {
        deny();
        return;
      }
      next();
      return;
    }
    const referer = req.headers.referer;
    if (typeof referer === "string") {
      let refererOrigin: string;
      try {
        refererOrigin = new URL(referer).origin;
      } catch {
        deny();
        return;
      }
      if (refererOrigin !== config.appOrigin) {
        deny();
        return;
      }
      next();
      return;
    }
    // Neither Origin nor Referer: no anti-CSRF evidence — deny by default.
    deny();
  }
  app.use("/api", requireTrustedOrigin);

  // POST /api/auth/login — available without existing credential.
  router.post("/auth/login", async (req: Request, res: Response) => {
    try {
      const result = await auth.login(req.body);
      if (!result.ok) {
        const code = result.errorCode === "VALIDATION_ERROR" ? 400 : 401;
        const errCode = result.errorCode ?? "INVALID_CREDENTIALS";
        res.status(code).json({
          error: {
            code: errCode,
            message: errCode === "VALIDATION_ERROR" ? "Invalid request." : "Invalid credentials.",
            requestId: req.requestId,
          },
        });
        return;
      }
      // Cookie transport: HttpOnly + Secure (deployed) + SameSite=Lax.
      res.cookie(config.session.cookieName, result.rawSessionId, {
        httpOnly: true,
        secure: config.session.cookieSecure,
        sameSite: "lax",
        path: "/",
        maxAge: config.session.absoluteMinutes * 60_000,
      });
      res.json({
        data: {
          user: { id: result.user!.id, username: result.user!.username, role: result.user!.role },
        },
      });
    } catch {
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal error.", requestId: req.requestId },
      });
    }
  });

  // GET /api/auth/me — current-user identity from trusted server state.
  router.get("/auth/me", requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({
      data: { user: { id: req.user!.id, username: req.user!.username, role: req.user!.role } },
    });
  });

  // POST /api/auth/logout — revoke server-side before reporting success.
  router.post("/auth/logout", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const rawId = req.cookies?.[config.session.cookieName] as string | undefined;
    try {
      const revoked = await auth.logout(rawId);
      if (!revoked) {
        // Already revoked or invalid — report 401 (no credential to revoke).
        res.status(401).json({
          error: { code: "UNAUTHENTICATED", message: "No active session.", requestId: req.requestId },
        });
        return;
      }
      res.clearCookie(config.session.cookieName, {
        httpOnly: true,
        secure: config.session.cookieSecure,
        sameSite: "lax",
        path: "/",
      });
      res.status(204).end();
    } catch {
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal error.", requestId: req.requestId },
      });
    }
  });

  app.use("/api", router);

  // Unknown /api routes: safe 404 without leaking implementation details.
  app.use("/api", (_req: Request, res: Response) => {
    res.status(404).json({
      error: { code: "NOT_FOUND", message: "Resource not found.", requestId: "n/a" },
    });
  });

  // Safe error handler — LAST. Converts body-parser and unexpected auth/storage
  // failures to the shared JSON envelope and never leaks stack traces or
  // internal diagnostics (contract §3, AC-F01-05/14; PR #22 review, P2-2).
  // Without this, Express's default handler returns text/html with details.
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    const requestId = req.requestId ?? "n/a";
    const type = typeof err === "object" && err !== null
      ? (err as { type?: string }).type
      : undefined;
    if (type === "entity.parse.failed" || type === "entity.too.large") {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid request body.", requestId },
      });
      return;
    }
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal error.", requestId },
    });
  });

  return app;
}
