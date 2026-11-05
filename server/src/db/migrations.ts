/**
 * Schema migration 001 — users + sessions (F-01 owns these tables only;
 * Request/Loan/Equipment schemas belong to F-02/F-04/F-05 and must not be
 * created here). Idempotent: safe to run repeatedly on the same database.
 *
 * Design notes (contract f-01-authentication.md §4, SDS §3.1/§7):
 * - `users.username` is unique under the recorded normalization policy
 *   (exact match, case-sensitive; enforced application-side and by index).
 * - `users.role` is constrained to the two permitted roles, one per user.
 * - `sessions.session_key` stores only a SHA-256 digest of the random session
 *   identifier; the raw identifier exists only in the client cookie.
 * - Revocation/expiry are server-side columns so replay after logout or
 *   restart is denied (TEST-F01-07 / TEST-F01-16).
 */
import type { PoolClient } from "pg";

export const MIGRATION_001_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_username_unique UNIQUE (username),
  CONSTRAINT users_role_check CHECK (role IN ('BORROWER', 'CUSTODIAN')),
  CONSTRAINT users_username_nonempty CHECK (length(username) > 0),
  CONSTRAINT users_password_hash_nonempty CHECK (length(password_hash) > 0)
);

CREATE TABLE IF NOT EXISTS sessions (
  session_key  TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  absolute_expires_at TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);

-- F-02 Equipment Catalog (contract f-02-equipment-catalog.md §5; SDS §3.1).
-- Quantity Tracking (SRS A-01): aggregate totals, no serial-level entity.
-- name/category nonempty; description may be empty; quantity_total >= 0
-- (fractional quantities are rejected at the typed boundary — catalog.ts).
CREATE TABLE IF NOT EXISTS equipment (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  description    TEXT NOT NULL,
  category       TEXT NOT NULL,
  quantity_total INTEGER NOT NULL,
  CONSTRAINT equipment_name_nonempty CHECK (length(name) > 0),
  CONSTRAINT equipment_category_nonempty CHECK (length(category) > 0),
  CONSTRAINT equipment_quantity_nonnegative CHECK (quantity_total >= 0)
);
`;

export async function migrate(client: Pick<PoolClient, "query">): Promise<void> {
  await client.query(MIGRATION_001_SQL);
}
