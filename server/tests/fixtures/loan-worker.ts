/** Standalone test process: no production route/config can enable these hooks. */
import express from "express";
import { createPool } from "../../src/db/pool";
import { loadConfig } from "../../src/config/config";
import { createApp } from "../../src/routes/auth-routes";
import { AuthService } from "../../src/services/auth";
import { SessionStore } from "../../src/services/session";
import { LoanService } from "../../src/services/loan";

const pool = createPool(process.env.TEST_DATABASE_URL!);
const config = loadConfig();
let release: (() => void) | undefined;
process.on("message", (message) => { if (message === "release") { release?.(); release = undefined; } });
const barrier = () => new Promise<void>((resolve) => { release = resolve; process.send?.("barrier"); });
const auth = new AuthService(pool, new SessionStore(pool, 60, 480));
const app = express();
app.use(async (req, _res, next) => {
  if (process.env.F05_TEST_MODE === "race" && req.method === "POST" && req.path.endsWith("/checkout")) await barrier();
  next();
});
const loans = new LoanService(pool, { timeZone: "Asia/Bangkok", afterInsert: async () => {
  if (process.env.F05_TEST_MODE === "hold") await barrier();
  if (process.env.F05_TEST_MODE === "fail") throw new Error("injected-test-only-failure");
} });
const server = app.listen(0, "127.0.0.1", () => {
  const port = (server.address() as { port: number }).port;
  config.appOrigin = `http://127.0.0.1:${port}`;
  app.use(createApp({ auth, config, loans }));
  process.send?.({ port });
});
process.on("disconnect", () => { server.close(); void pool.end(); });
