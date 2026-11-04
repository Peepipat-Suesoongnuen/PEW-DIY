/**
 * Application entry point — boot config, pool, services, and HTTP server.
 * Fails closed on missing configuration (config.ts). Run migrations+seed
 * before start in dev; production migration is an explicit deploy step (SDS §4).
 */
import { loadConfig } from "./config/config";
import { createPool } from "./db/pool";
import { SessionStore } from "./services/session";
import { AuthService } from "./services/auth";
import { createApp } from "./routes/auth-routes";

const config = loadConfig();
const pool = createPool(config.databaseUrl);
const sessions = new SessionStore(pool, config.session.idleMinutes, config.session.absoluteMinutes);
const auth = new AuthService(pool, sessions);
const app = createApp({ auth, config });

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`PEW-DIY listening on http://localhost:${config.port}`);
});
