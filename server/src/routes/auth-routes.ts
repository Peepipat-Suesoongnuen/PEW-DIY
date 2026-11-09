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
import { existsSync } from "fs";
import path from "path";
import { AuthService } from "../services/auth";
import { createAuthMiddleware, AuthenticatedRequest } from "../services/authz";
import { createEquipmentRouter } from "./equipment-routes";
import { createRequestRouter } from "./request-routes";
import { createLoanRouter } from "./loan-routes";
import { LoanService } from "../services/loan";
import type { BorrowingRequestService } from "../services/borrowing-request";
import { AppConfig } from "../config/config";

export interface AppDeps {
  auth: AuthService;
  config: AppConfig;
  requests?: BorrowingRequestService;
  loans?: LoanService;
}

export function createApp({ auth, config, requests, loans }: AppDeps): express.Application {
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
  app.use("/api", createLoanRouter(auth, config.session.cookieName, loans ?? new LoanService(auth.pool, { timeZone: config.appTimezone })));
  app.use("/api", createRequestRouter(auth, config.session.cookieName, requests));

  // F-02 Equipment Catalog routes (GET /api/equipment, GET /api/equipment/:id).
  // Mounted before the unknown-route 404 handler; shares the auth guard.
  app.use("/api", createEquipmentRouter({ auth, cookieName: config.session.cookieName }));

  // Static UI (UI-02, ARCH-01 §12.1 coexistence plan):
  // - The React application build is served from client/dist (index.html at
  //   "/", hashed assets under /assets) — `vite build` output.
  // - The legacy framework-free pages (client/*.html, F-02) keep being served
  //   at their .html paths until they are retired at migration phase P4.
  // - `index: false` on client/ keeps its Vite source entry (client/index.html)
  //   from shadowing the built app shell at "/".
  // Real files always win over the SPA fallback below.
  const clientDistDir = path.resolve(process.cwd(), "client", "dist");
  app.use(express.static(clientDistDir));
  const clientDir = path.resolve(process.cwd(), "client");
  app.use(express.static(clientDir, { index: false }));

  // Unknown /api routes: safe 404 without leaking implementation details.
  app.use("/api", (_req: Request, res: Response) => {
    res.status(404).json({
      error: { code: "NOT_FOUND", message: "Resource not found.", requestId: "n/a" },
    });
  });

  // SPA history fallback (ARCH-01 §12.1): GET/HEAD navigations that accept
  // HTML, are not /api/* and matched no real file receive the React app shell
  // so direct URLs and browser refreshes work for all client routes. /api/*
  // can never fall through to index.html — the JSON 404 above handles it
  // first. Without a client build (fresh clone), requests fall through to the
  // default 404 instead.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }
    if (req.path.startsWith("/api/")) {
      next();
      return;
    }
    if (!req.accepts("html")) {
      next();
      return;
    }
    const appShell = path.join(clientDistDir, "index.html");
    if (!existsSync(appShell)) {
      next();
      return;
    }
    res.sendFile(appShell);
  });

  // Safe error handler — LAST. Converts body-parser and unexpected auth/storage
  // failures to the shared JSON envelope and never leaks stack traces or
  // internal diagnostics (contract §3, AC-F01-05/14; PR #22 review, P2-2).
  // Without this, Express's default handler returns text/html with details.
  // Database unavailability maps to 503 SERVICE_UNAVAILABLE per the shared
  // convention (f-02 contract §4); other unexpected failures use safe 500.
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
    const errCode = typeof err === "object" && err !== null ? (err as { code?: string }).code : undefined;
    const isDbUnavailable = ["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "57P03", "08001", "08006"].includes(errCode ?? "")
      || (typeof (err as { message?: string })?.message === "string" && /connection|timeout/i.test((err as { message: string }).message));
    if (isDbUnavailable) {
      res.status(503).json({
        error: { code: "SERVICE_UNAVAILABLE", message: "Service temporarily unavailable.", requestId },
      });
      return;
    }
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Internal error.", requestId },
    });
  });

  return app;
}
