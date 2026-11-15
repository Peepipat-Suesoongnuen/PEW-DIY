/** Database readiness endpoint for deployment health checks (Issue #44). */
import { Router } from "express";
import type { Pool } from "pg";

/**
 * Creates the readiness route with the application's existing database pool.
 * A successful lightweight query proves the database is reachable; failures
 * are intentionally reduced to a safe 503 response without internal details.
 */
export function createHealthRouter(pool: Pick<Pool, "query">): Router {
  const router = Router();

  router.get("/ready", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.status(200).json({ status: "ready", db: "connected" });
    } catch {
      res.status(503).json({ status: "not_ready" });
    }
  });

  return router;
}
