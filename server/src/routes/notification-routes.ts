import { Router, type Response, type NextFunction } from "express";
import type { AuthService } from "../services/auth";
import { createAuthMiddleware, type AuthenticatedRequest } from "../services/authz";
import { RequestError } from "../services/borrowing-request";
import { NotificationService } from "../services/notification";

export function createNotificationRouter(
  auth: AuthService,
  cookieName: string,
  service: NotificationService,
): Router {
  const router = Router();
  const { requireAuth } = createAuthMiddleware(auth, cookieName);
  router.use("/notifications", requireAuth);

  const failure = (error: unknown, req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!(error instanceof RequestError)) return next(error);
    res.status(error.status).json({ error: { code: error.code, message: error.safeMessage, requestId: req.requestId } });
  };

  router.get("/notifications", async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json({ data: await service.list(req.user!) });
    } catch (error) {
      failure(error, req, res, next);
    }
  });

  router.post("/notifications/:notificationId/read", async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json({ data: await service.markRead(req.user!, String(req.params.notificationId)) });
    } catch (error) {
      failure(error, req, res, next);
    }
  });

  router.delete("/notifications", async (req: AuthenticatedRequest, res, next) => {
    try {
      await service.clearAll(req.user!);
      res.status(204).end();
    } catch (error) {
      failure(error, req, res, next);
    }
  });

  return router;
}
