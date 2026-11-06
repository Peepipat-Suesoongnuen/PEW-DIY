/**
 * Schema migrations — idempotent: safe to run repeatedly on the same database.
 *
 * Migration 001 (F-01 owns users/sessions; Equipment added by F-02).
 * Migration 002 (F-04) owns BorrowingRequest; migration003 (F-05) owns Loan.
 * Per the team decision
 * on Issue #10 (2026-11-06 audit) and the feature-contract ownership split
 * (f-03 §4 line 68, f-04 §3 Data/migrations, f-05 §3 Data/migrations),
 * BorrowingRequest DDL belongs to F-04 (#11) and Loan DDL belongs to F-05
 * (#12). The retained handover note below documents the shared schema shape.
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

/**
 * HANDOVER NOTE — Request/Loan DDL ownership (#11 / #12), team decision
 * 2026-11-06 (Issue #10 audit: "MOVE Migration 002").
 * F-04 now installs borrowing_requests via MIGRATION_002_REQUESTS_SQL below.
 * Only loans remains absent until #12; no F-05 schema is fabricated here.
 *
 * The F-03 aggregate read (services/catalog.ts) expects the D1-03 §3.1 shape
 * below and probes for these relations at runtime (`to_regclass`); until they
 * exist, held units are definitionally zero ("no loans possible yet" — the
 * documented pre-F-04/F-05 boundary) and the real-DB loan-dependent tests are
 * dependency-gated (skipped) in server/tests/availability.test.ts and
 * restart-e2e.test.ts.
 *
 * #11 / F-04 — `borrowing_requests` (f-04 §3 Data/migrations):
 *   id TEXT PK · borrower_id TEXT NOT NULL REFERENCES users(id) ·
 *   equipment_id TEXT NOT NULL REFERENCES equipment(id) ·
 *   quantity_requested INTEGER NOT NULL CHECK (quantity_requested > 0) ·
 *   created_at TIMESTAMPTZ NOT NULL
 *   Indexes: equipment_id (item lookup) + borrower_id (owner lookup —
 *   f-04 specifies "owner/item lookup indexes"; only the item index was
 *   prototyped here, the owner index is part of #11's migration).
 *   No status column (status derives from the Loan relation), no
 *   cascade-delete (preserve history).
 *
 * #12 / F-05 — `loans` (f-05 §3 Data/migrations):
 *   id TEXT PK · request_id TEXT NOT NULL UNIQUE REFERENCES
 *   borrowing_requests(id) · quantity_borrowed INTEGER NOT NULL CHECK
 *   (quantity_borrowed > 0) · checked_out_by TEXT NOT NULL REFERENCES
 *   users(id) · checkout_at TIMESTAMPTZ NOT NULL · due_on DATE NOT NULL ·
 *   returned_at TIMESTAMPTZ NULL · returned_by TEXT NULL REFERENCES users(id)
 *   (nullable return pair = later lifecycle; unset in S1).
 *   Uniqueness of request_id = "at most one loan per request" (D1-03).
 *
 * The CHECKs are D1-03's positive-quantity integrity rules (they back Issue
 * #10 AC-06.3-03 at the data layer and are re-verified by the gated tests).
 */

export async function migrate(client: Pick<PoolClient, "query">): Promise<void> {
  await client.query(MIGRATION_001_SQL);
  await client.query(MIGRATION_002_REQUESTS_SQL);
  await client.query(MIGRATION_003_LOANS_SQL);
}

/** F-05: stock and request status derive from this durable relation. */
export const MIGRATION_003_LOANS_SQL = `
CREATE TABLE IF NOT EXISTS loans (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE REFERENCES borrowing_requests(id),
  quantity_borrowed INTEGER NOT NULL CHECK (quantity_borrowed > 0),
  checked_out_by TEXT NOT NULL REFERENCES users(id),
  checkout_at TIMESTAMPTZ NOT NULL,
  due_on DATE NOT NULL,
  returned_at TIMESTAMPTZ,
  returned_by TEXT REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS loans_active_request_idx ON loans(request_id) WHERE returned_at IS NULL;
`;

/** F-04 (#11): requests preserve history; no reservation/status counter or Loan DDL. */
export const MIGRATION_002_REQUESTS_SQL = `
CREATE TABLE IF NOT EXISTS borrowing_requests (
  id TEXT PRIMARY KEY,
  borrower_id TEXT NOT NULL REFERENCES users(id),
  equipment_id TEXT NOT NULL REFERENCES equipment(id),
  quantity_requested INTEGER NOT NULL CHECK (quantity_requested > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS borrowing_requests_owner_idx ON borrowing_requests(borrower_id, created_at);
CREATE INDEX IF NOT EXISTS borrowing_requests_equipment_idx ON borrowing_requests(equipment_id);
`;
