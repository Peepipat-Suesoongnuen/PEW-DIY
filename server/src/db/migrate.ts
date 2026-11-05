/**
 * Migration runner — applies versioned migrations to the target database.
 * Usage: npx tsx src/db/migrate.ts
 */
import { loadConfig } from "../config/config";
import { createPool } from "./pool";
import { migrate } from "./migrations";

async function main() {
  const config = loadConfig();
  const pool = createPool(config.databaseUrl);
  await migrate(pool);
  console.log("Migration complete.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
