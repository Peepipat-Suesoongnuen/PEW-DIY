import "../server/src/config/config.ts";
import { createPool } from "../server/src/db/pool.ts";
import { migrate } from "../server/src/db/migrations.ts";

if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required; no dev database fallback");
const pool = createPool(process.env.TEST_DATABASE_URL);
try { await migrate(pool); console.log("Test database migrations complete."); }
finally { await pool.end(); }
