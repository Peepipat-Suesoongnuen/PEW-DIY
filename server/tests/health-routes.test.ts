/** HTTP tests for the database readiness endpoint (Issue #44, AC-READINESS). */
import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { createHealthRouter } from "../src/routes/health-routes";
import { createApp } from "../src/routes/auth-routes";
import { AuthService } from "../src/services/auth";
import { SessionStore } from "../src/services/session";
import { loadConfig } from "../src/config/config";

describe("GET /api/ready", () => {
  it("returns 200 when the database responds to SELECT 1", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] });
    const app = express();
    app.use("/api", createHealthRouter({ query } as unknown as Pick<Pool, "query">));

    const response = await request(app).get("/api/ready");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ready", db: "connected" });
    expect(query).toHaveBeenCalledOnce();
    expect(query).toHaveBeenCalledWith("SELECT 1");
  });

  it("returns a safe 503 response when the database query fails", async () => {
    const query = vi.fn().mockRejectedValue(new Error("secret-dsn-detail must not leak"));
    const app = express();
    app.use("/api", createHealthRouter({ query } as unknown as Pick<Pool, "query">));

    const response = await request(app).get("/api/ready");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: "not_ready" });
    expect(JSON.stringify(response.body)).not.toContain("secret-dsn-detail");
  });

  it("returns 503 when the database connection is unavailable", async () => {
    const query = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:5432"));
    const app = express();
    app.use("/api", createHealthRouter({ query } as unknown as Pick<Pool, "query">));

    const response = await request(app).get("/api/ready");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: "not_ready" });
  });

  it("is mounted in the application and does not require authentication", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] });
    const pool = { query } as unknown as Pool;
    const sessions = new SessionStore(pool, 60, 480);
    const auth = new AuthService(pool, sessions);
    const config = loadConfig({
      DATABASE_URL: "postgres://unused",
      PORT: "3000",
      APP_ORIGIN: "http://localhost:5173",
      SESSION_IDLE_MINUTES: "60",
      SESSION_ABSOLUTE_MINUTES: "480",
      SESSION_COOKIE_NAME: "pew_session",
      SESSION_COOKIE_SECURE: "false",
    });
    const app = createApp({ auth, config });

    const response = await request(app).get("/api/ready");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ready", db: "connected" });
    expect(query).toHaveBeenCalledWith("SELECT 1");
  });
});
