/**
 * Equipment Catalog HTTP routes (F-02) — contract `f-02-equipment-catalog.md` §4.
 *
 * GET /api/equipment          — list catalog (authenticated Borrower or Custodian)
 * GET /api/equipment/{id}     — item detail (same permission)
 *
 * Read-only: catalog reads never mutate stock/requests/loans. No editing or
 * search/filter endpoints in Sprint 1 (contract §4 "No-change layers").
 * Missing item → safe 404; empty catalog → 200 `data: []`; unavailable
 * database → 503 SERVICE_UNAVAILABLE with the shared safe envelope.
 */
import { Router, Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth";
import { createAuthMiddleware, AuthenticatedRequest } from "../services/authz";
import { listEquipment, getEquipment, AvailabilityIntegrityError } from "../services/catalog";

export interface EquipmentRouteDeps {
  auth: AuthService;
  cookieName: string;
}

/** True when the error is a database connection/availability failure (→ 503). */
export function isDatabaseUnavailable(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: string; message?: string };
  const code = e.code ?? "";
  if (["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "57P03", "08001", "08006"].includes(code)) return true;
  return typeof e.message === "string" && /connection|timeout|terminat/i.test(e.message) && !/VALIDATION/.test(e.message);
}

export function createEquipmentRouter({ auth, cookieName }: EquipmentRouteDeps): Router {
  const router = Router();
  const { requireAuth } = createAuthMiddleware(auth, cookieName);
  router.use(requireAuth);

  router.get("/equipment", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const items = await listEquipment(auth.pool);
      res.json({ data: items });
    } catch (err) {
      if (err instanceof AvailabilityIntegrityError) {
        // f-03 §2/§4: corrupt persisted aggregate = safe 500 with a REDACTED
        // diagnostic; never clamp, never publish negative quantities.
        console.warn(`[availability] integrity violation on ${req.path} (requestId=${req.requestId})`);
        res.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "Internal error.", requestId: req.requestId },
        });
        return;
      }
      next(err);
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
      if (err instanceof AvailabilityIntegrityError) {
        console.warn(`[availability] integrity violation on ${req.path} (requestId=${req.requestId})`);
        res.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "Internal error.", requestId: req.requestId },
        });
        return;
      }
      next(err);
    }
  });

  return router;
}
