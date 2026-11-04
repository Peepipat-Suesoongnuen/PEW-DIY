/**
 * HTTP routes — authentication endpoints (contract §3, shared-conventions).
 *
 * Cookie transport (D2: server session + HttpOnly cookie + CSRF-ready):
 * - SESSION_COOKIE_NAME cookie carries the raw session id; HttpOnly and
 *   Secure (deployed) attributes per SDS §7.2.
 * - Login sets the cookie only after successful session creation.
 * - Logout revokes server-side then clears the cookie; 204 on success.
 */
import express, { Request, Response, Router } from "express";
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
  app.use(express.json({ limit: "10kb" }));
  app.use(cookieParser());

  // Request ID middleware for safe error correlation (shared-conventions).
  app.use((req: Request, res: Response, next) => {
    req.requestId = randomUUID();
    next();
  });

  const { requireAuth } = createAuthMiddleware(auth, config.session.cookieName);
  const router = Router();

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

  return app;
}
