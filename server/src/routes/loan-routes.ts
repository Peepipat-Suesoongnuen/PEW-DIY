import { Router, type Response, type NextFunction } from "express";
import type { AuthService } from "../services/auth";
import { createAuthMiddleware, type AuthenticatedRequest } from "../services/authz";
import { RequestError } from "../services/borrowing-request";
import type { LoanScope, LoanService } from "../services/loan";

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
  router.post("/request-bundles/:bundleId/checkout", requireAuth, requireRole("CUSTODIAN"), async (req: AuthenticatedRequest, res, next) => {
    try { res.status(201).json({ data: await service.checkoutBundle(req.user!, String(req.params.bundleId), req.body) }); }
    catch (error) { failure(error, req, res, next); }
  });
  router.use("/loans", requireAuth);
  router.get("/loans", async (req: AuthenticatedRequest, res, next) => {
    try {
      const rawScope = typeof req.query.scope === "string" && req.query.scope !== "" ? req.query.scope : "active";
      res.json({ data: await service.list(req.user!, rawScope as LoanScope) });
    } catch (error) { failure(error, req, res, next); }
  });
  router.get("/loans/:loanId", async (req: AuthenticatedRequest, res, next) => {
    try { res.json({ data: await service.get(req.user!, String(req.params.loanId)) }); }
    catch (error) { failure(error, req, res, next); }
  });
  router.post("/loans/:loanId/request-return", requireRole("BORROWER"), async (req: AuthenticatedRequest, res, next) => {
    try { res.json({ data: await service.requestReturn(req.user!, String(req.params.loanId), req.body) }); }
    catch (error) { failure(error, req, res, next); }
  });
  router.post("/loans/:loanId/return", requireRole("CUSTODIAN"), async (req: AuthenticatedRequest, res, next) => {
    try { res.json({ data: await service.confirmReturn(req.user!, String(req.params.loanId), req.body) }); }
    catch (error) { failure(error, req, res, next); }
  });
  router.post("/loan-bundles/:bundleId/return", requireAuth, requireRole("CUSTODIAN"), async (req: AuthenticatedRequest, res, next) => {
    try { res.json({ data: await service.confirmBundleReturn(req.user!, String(req.params.bundleId), req.body) }); }
    catch (error) { failure(error, req, res, next); }
  });
  return router;
}
