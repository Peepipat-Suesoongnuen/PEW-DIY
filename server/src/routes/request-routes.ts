import { Router, type Response, type NextFunction } from "express";
import type { AuthService } from "../services/auth";
import { createAuthMiddleware, type AuthenticatedRequest } from "../services/authz";
import { BorrowingRequestService, RequestError } from "../services/borrowing-request";

export function createRequestRouter(auth: AuthService, cookieName: string, service = new BorrowingRequestService(auth.pool)): Router {
  const router = Router();
  const { requireAuth, requireRole } = createAuthMiddleware(auth, cookieName);
  router.use("/requests", requireAuth);
  const failure = (error: unknown, req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!(error instanceof RequestError)) return next(error);
    res.status(error.status).json({ error: { code: error.code, message: error.safeMessage, requestId: req.requestId } });
  };
  router.post("/requests", requireRole("BORROWER"), async (req: AuthenticatedRequest, res, next) => {
    try { res.status(201).json({ data: await service.create(req.user!, req.body) }); }
    catch (error) { failure(error, req, res, next); }
  });
  router.get("/requests", async (req: AuthenticatedRequest, res, next) => {
    try { res.json({ data: await service.list(req.user!) }); }
    catch (error) { failure(error, req, res, next); }
  });
  router.get("/requests/:requestId", async (req: AuthenticatedRequest, res, next) => {
    try { res.json({ data: await service.get(req.user!, String(req.params.requestId)) }); }
    catch (error) { failure(error, req, res, next); }
  });
  return router;
}
