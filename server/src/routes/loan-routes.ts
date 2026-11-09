import { Router, type Response, type NextFunction } from "express";
import type { AuthService } from "../services/auth";
import { createAuthMiddleware, type AuthenticatedRequest } from "../services/authz";
import { RequestError } from "../services/borrowing-request";
import type { LoanService } from "../services/loan";

export function createLoanRouter(auth: AuthService, cookieName: string, service: LoanService): Router {
  const router = Router();
  const { requireAuth, requireRole } = createAuthMiddleware(auth, cookieName);
  const failure = (error: unknown, req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!(error instanceof RequestError)) return next(error);
    res.status(error.status).json({ error: { code: error.code, message: error.safeMessage, requestId: req.requestId } });
  };
  router.post("/requests/:requestId/checkout", requireAuth, requireRole("CUSTODIAN"), async (req: AuthenticatedRequest, res, next) => {
    try { res.status(201).json({ data: await service.checkout(req.user!, String(req.params.requestId), req.body) }); }
    catch (error) { failure(error, req, res, next); }
  });
  router.use("/loans", requireAuth, requireRole("BORROWER"));
  router.get("/loans", async (req: AuthenticatedRequest, res, next) => {
    try { res.json({ data: await service.list(req.user!) }); }
    catch (error) { failure(error, req, res, next); }
  });
  router.get("/loans/:loanId", async (req: AuthenticatedRequest, res, next) => {
    try { res.json({ data: await service.get(req.user!, String(req.params.loanId)) }); }
    catch (error) { failure(error, req, res, next); }
  });
  return router;
}
