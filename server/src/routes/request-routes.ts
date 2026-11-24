import { Router, type Response, type NextFunction } from "express";
import type { AuthService } from "../services/auth";
import { createAuthMiddleware, type AuthenticatedRequest } from "../services/authz";
import { BorrowingRequestService, RequestError } from "../services/borrowing-request";

export function createRequestRouter(
  auth: AuthService,
  cookieName: string,
  service = new BorrowingRequestService(auth.pool),
): Router {
  const router = Router();
  const { requireAuth, requireRole } = createAuthMiddleware(auth, cookieName);
  router.use("/requests", requireAuth);
  router.use("/request-bundles", requireAuth);

  const failure = (error: unknown, req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!(error instanceof RequestError)) return next(error);
    res.status(error.status).json({ error: { code: error.code, message: error.safeMessage, requestId: req.requestId } });
  };

  router.post("/requests", requireRole("BORROWER"), async (req: AuthenticatedRequest, res, next) => {
    try {
      res.status(201).json({ data: await service.create(req.user!, req.body) });
    } catch (error) {
      failure(error, req, res, next);
    }
  });

  router.post("/request-bundles", requireRole("BORROWER"), async (req: AuthenticatedRequest, res, next) => {
    try {
      res.status(201).json({ data: await service.createBundle(req.user!, req.body) });
    } catch (error) {
      failure(error, req, res, next);
    }
  });

  router.get("/requests", async (req: AuthenticatedRequest, res, next) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const q = typeof req.query.q === "string" ? req.query.q : undefined;
      res.json({ data: await service.list(req.user!, { status, q }) });
    } catch (error) {
      failure(error, req, res, next);
    }
  });

  router.get("/requests/:requestId", async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json({ data: await service.get(req.user!, String(req.params.requestId)) });
    } catch (error) {
      failure(error, req, res, next);
    }
  });

  router.post("/requests/:requestId/approve", requireRole("CUSTODIAN"), async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json({ data: await service.decide(req.user!, String(req.params.requestId), "APPROVED", req.body) });
    } catch (error) {
      failure(error, req, res, next);
    }
  });

  router.post("/requests/:requestId/reject", requireRole("CUSTODIAN"), async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json({ data: await service.decide(req.user!, String(req.params.requestId), "REJECTED", req.body) });
    } catch (error) {
      failure(error, req, res, next);
    }
  });

  router.post("/requests/:requestId/cancel", requireRole("BORROWER"), async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json({ data: await service.cancel(req.user!, String(req.params.requestId)) });
    } catch (error) {
      failure(error, req, res, next);
    }
  });

  router.post("/request-bundles/:bundleId/approve", requireRole("CUSTODIAN"), async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json({ data: await service.decideBundle(req.user!, String(req.params.bundleId), "APPROVED", req.body) });
    } catch (error) {
      failure(error, req, res, next);
    }
  });

  router.post("/request-bundles/:bundleId/reject", requireRole("CUSTODIAN"), async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json({ data: await service.decideBundle(req.user!, String(req.params.bundleId), "REJECTED", req.body) });
    } catch (error) {
      failure(error, req, res, next);
    }
  });

  router.post("/request-bundles/:bundleId/cancel", requireRole("BORROWER"), async (req: AuthenticatedRequest, res, next) => {
    try {
      res.json({ data: await service.cancelBundle(req.user!, String(req.params.bundleId)) });
    } catch (error) {
      failure(error, req, res, next);
    }
  });

  return router;
}
