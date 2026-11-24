/**
 * Equipment Catalog HTTP routes (F-02, F-08) — contracts `f-02-equipment-catalog.md`,
 * `f-08-catalog-search-loans.md`.
 */
import { Router, Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth";
import { createAuthMiddleware, AuthenticatedRequest } from "../services/authz";
import {
  listEquipment,
  getEquipment,
  createEquipment,
  updateEquipment,
  AvailabilityIntegrityError,
  CatalogError,
  type CatalogSort,
  type CatalogStatus,
  type EquipmentFilter,
} from "../services/catalog";

export interface EquipmentRouteDeps {
  auth: AuthService;
  cookieName: string;
}

const PG_UNAVAILABLE_CODES = new Set([
  "08000", "08003", "08006", "08001", "08004", "08007", "08P01",
  "57P01", "57P02", "57P03", "53300",
]);
const NODE_NET_CODES = new Set(["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EPIPE"]);

export function isDatabaseUnavailable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  if (typeof code === "string" && (PG_UNAVAILABLE_CODES.has(code) || NODE_NET_CODES.has(code))) {
    return true;
  }
  const msg = (err as { message?: unknown }).message;
  return typeof msg === "string" && /connection terminated|connect ECONN|terminating connection/i.test(msg);
}

function parseListFilter(req: AuthenticatedRequest): EquipmentFilter {
  const filter: EquipmentFilter = {};
  if (typeof req.query.q === "string") filter.q = req.query.q;
  if (typeof req.query.category === "string") filter.category = req.query.category;

  if (typeof req.query.availability === "string" && req.query.availability !== "") {
    if (req.query.availability !== "AVAILABLE" && req.query.availability !== "UNAVAILABLE") {
      throw new CatalogError(400, "VALIDATION_ERROR", "Invalid availability filter.");
    }
    filter.availability = req.query.availability;
  }

  if (req.user?.role === "BORROWER") {
    // Borrowers only list ACTIVE catalog items (FR-09 / A-10).
    filter.status = "ACTIVE";
  } else if (typeof req.query.status === "string" && req.query.status !== "") {
    if (!["ACTIVE", "RETIRED", "ALL"].includes(req.query.status)) {
      throw new CatalogError(400, "VALIDATION_ERROR", "Invalid status filter.");
    }
    filter.status = req.query.status as CatalogStatus | "ALL";
  }

  if (typeof req.query.sort === "string" && req.query.sort !== "") {
    if (!["name_asc", "name_desc", "available_desc", "available_asc"].includes(req.query.sort)) {
      throw new CatalogError(400, "VALIDATION_ERROR", "Invalid sort parameter.");
    }
    filter.sort = req.query.sort as CatalogSort;
  }

  return filter;
}

export function createEquipmentRouter({ auth, cookieName }: EquipmentRouteDeps): Router {
  const router = Router();
  const { requireAuth, requireRole } = createAuthMiddleware(auth, cookieName);
  router.use("/equipment", requireAuth);

  const handleCatalogError = (err: unknown, req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (err instanceof CatalogError) {
      res.status(err.status).json({
        error: { code: err.code, message: err.safeMessage, requestId: req.requestId },
      });
      return;
    }
    if (err instanceof AvailabilityIntegrityError) {
      console.warn(`[availability] integrity violation on ${req.path} (requestId=${req.requestId})`);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal error.", requestId: req.requestId },
      });
      return;
    }
    next(err);
  };

  router.get("/equipment", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const filter = parseListFilter(req);
      const items = await listEquipment(auth.pool, filter);
      res.json({ data: items });
    } catch (err) {
      handleCatalogError(err, req, res, next);
    }
  });

  router.get("/equipment/:equipmentId", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.equipmentId;
      if (typeof id !== "string" || id.length === 0) {
        res.status(400).json({
          error: { code: "VALIDATION_ERROR", message: "Invalid request.", requestId: req.requestId },
        });
        return;
      }
      const item = await getEquipment(auth.pool, id);
      if (!item) {
        res.status(404).json({
          error: { code: "NOT_FOUND", message: "Resource not found.", requestId: req.requestId },
        });
        return;
      }
      res.json({ data: item });
    } catch (err) {
      handleCatalogError(err, req, res, next);
    }
  });

  router.post(
    "/equipment",
    requireRole("CUSTODIAN"),
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const item = await createEquipment(auth.pool, req.body);
        res.status(201).json({ data: item });
      } catch (err) {
        handleCatalogError(err, req, res, next);
      }
    },
  );

  router.patch(
    "/equipment/:equipmentId",
    requireRole("CUSTODIAN"),
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const item = await updateEquipment(auth.pool, String(req.params.equipmentId), req.body);
        res.json({ data: item });
      } catch (err) {
        handleCatalogError(err, req, res, next);
      }
    },
  );

  return router;
}
