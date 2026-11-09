/**
 * E2E fixtures — seeded accounts and synthetic equipment (ARCH-01 §11).
 * Passwords come from the environment (`.env` SEED_PASSWORD_* values) and are
 * never hardcoded or logged. Equipment ids/names match server/src/db/seed.ts.
 */

export interface Account {
  username: string;
  password: string;
}

function account(username: string, envVar: string): Account {
  const password = process.env[envVar];
  if (!password) {
    throw new Error(`Missing ${envVar} — seed passwords must come from the environment (.env), never from source.`);
  }
  return { username, password };
}

export const ACCOUNTS = {
  borrower: () => account("B-A", "SEED_PASSWORD_BA"),
  secondBorrower: () => account("B-B", "SEED_PASSWORD_BB"),
  custodian: () => account("C-A", "SEED_PASSWORD_CA"),
};

export const ITEMS = {
  one: { id: "fixture-e-one", name: "Synthetic single-unit fixture" },
  many: { id: "fixture-e-many", name: "Synthetic pooled fixture" },
  zero: { id: "fixture-e-zero", name: "Synthetic zero-stock fixture" },
};
