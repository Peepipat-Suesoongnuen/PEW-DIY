/**
 * Seed script — reproducible demo accounts + synthetic equipment fixtures
 * (contract §4, fixtures.md; F-02 AC-F02-04).
 *
 * Security obligations (TEST-F01-11/12):
 * - Passwords come from local env (SEED_PASSWORD_*); only salted hashes reach
 *   the database. No plaintext in tracked files, logs or fixtures.
 * - Reruns preserve existing credentials/roles (upsert-safe, no reset).
 * - Seeded accounts: B-A, B-B (BORROWER), C-A (CUSTODIAN).
 *
 * F-02 equipment fixtures (synthetic — SRS OQ-01 (real catalog) remains
 * OPEN; these are NOT the approved real catalog): E-ONE (total 1),
 * E-MANY (3), E-ZERO (0) per fixtures.md. Non-destructive: never overwrites
 * existing totals, never touches users/requests/loans.
 *
 * Usage: SEED_PASSWORD_BA=... SEED_PASSWORD_BB=... SEED_PASSWORD_CA=... \
 *        npm run seed
 */
import { loadConfig } from "../config/config";
import { createPool, withTransaction } from "./pool";
import { hashPassword } from "../services/password";
import { seedEquipmentFixture, EquipmentInput } from "../services/catalog";

interface SeedAccount {
  id: string;
  username: string;
  role: "BORROWER" | "CUSTODIAN";
  envVar: string;
}

const ACCOUNTS: SeedAccount[] = [
  { id: "seed-b-a", username: "B-A", role: "BORROWER", envVar: "SEED_PASSWORD_BA" },
  { id: "seed-b-b", username: "B-B", role: "BORROWER", envVar: "SEED_PASSWORD_BB" },
  { id: "seed-c-a", username: "C-A", role: "CUSTODIAN", envVar: "SEED_PASSWORD_CA" },
];

const EQUIPMENT: EquipmentInput[] = [
  { id: "fixture-e-one", name: "Synthetic single-unit fixture", description: "Test fixture", category: "Synthetic", quantityTotal: 1 },
  { id: "fixture-e-many", name: "Synthetic pooled fixture", description: "Test fixture", category: "Synthetic", quantityTotal: 3 },
  { id: "fixture-e-zero", name: "Synthetic zero-stock fixture", description: "Test fixture", category: "Synthetic", quantityTotal: 0 },
];

async function main() {
  const config = loadConfig();
  const pool = createPool(config.databaseUrl);

  await withTransaction(pool, async (client) => {
    for (const account of ACCOUNTS) {
      const password = process.env[account.envVar];
      if (!password || password.length === 0) {
        throw new Error(`Missing ${account.envVar} (fail-closed; supply via local env)`);
      }
      const hash = await hashPassword(password);

      // Upsert-safe: preserve existing hash/role on rerun (no credential reset).
      const existing = await client.query(
        `SELECT id FROM users WHERE id = $1 OR username = $2`,
        [account.id, account.username],
      );
      if ((existing.rowCount ?? 0) === 0) {
        await client.query(
          `INSERT INTO users (id, username, password_hash, role) VALUES ($1, $2, $3, $4)`,
          [account.id, account.username, hash, account.role],
        );
        console.log(`Seeded ${account.username} (${account.role})`);
      } else {
        console.log(`Skipped ${account.username} — already exists (preserved)`);
      }
    }

    // F-02: synthetic equipment fixtures (non-destructive; SRS OQ-01 open).
    for (const item of EQUIPMENT) {
      const result = await seedEquipmentFixture(client, item);
      console.log(`${result === "inserted" ? "Seeded" : "Skipped"} equipment ${item.id} (${item.name})`);
    }
  });

  await pool.end();
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error("Seed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
