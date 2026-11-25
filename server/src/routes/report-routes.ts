import { Router, type Response } from "express";
import type { AuthService } from "../services/auth";
import { createAuthMiddleware, type AuthenticatedRequest } from "../services/authz";
import { ReportingService } from "../services/reporting";

export function createReportRouter(auth: AuthService, cookieName: string, service: ReportingService): Router {
  const router = Router();
  const { requireAuth, requireRole } = createAuthMiddleware(auth, cookieName);

  router.get(
    "/reports/summary",
    requireAuth,
    requireRole("CUSTODIAN"),
    async (_req: AuthenticatedRequest, res: Response, next) => {
      try {
        res.json({ data: await service.getSummary() });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
