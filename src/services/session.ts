/**
 * Session store — server-side sessions with durable revocation (D2).
 *
 * Contract basis: f-01-authentication.md §2.1/§4; SDS §7.2 server-session
 * option. Every row stores only a SHA-256 digest of the raw session id; the
 * raw value exists solely in the client cookie. Logout revokes server-side
 * before success is reported; expiry is enforced on every read.
 */
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import type { Pool } from "pg";

export interface SessionUser {
  id: string;
  username: string;
  role: "BORROWER" | "CUSTODIAN";
}

export interface SessionRecord {
  user: SessionUser;
  expiresAt: Date;
  absoluteExpiresAt: Date;
}

/** Injectable clock seam for expiry tests (TEST-F01-08). */
export type Clock = () => Date;

export class SessionStore {
  constructor(
    private readonly pool: Pool,
    private readonly idleMinutes: number,
    private readonly absoluteMinutes: number,
    private readonly clock: Clock = () => new Date(),
  ) {}

  /** Creates a fresh session; returns the raw id for the client cookie only. */
  async create(userId: string): Promise<{ rawId: string; expiresAt: Date }> {
    const rawId = randomBytes(32).toString("base64url");
    const now = this.clock();
    const expiresAt = new Date(now.getTime() + this.idleMinutes * 60_000);
    const absoluteExpiresAt = new Date(now.getTime() + this.absoluteMinutes * 60_000);
    await this.pool.query(
      `INSERT INTO sessions (session_key, user_id, created_at, expires_at, absolute_expires_at, last_seen_at)
       VALUES ($1, $2, $3, $4, $5, $3)`,
      [this.digest(rawId), userId, now, expiresAt, absoluteExpiresAt],
    );
    return { rawId, expiresAt };
  }

  /**
   * Resolves a raw session id to its user, enforcing idle and absolute
   * expiry. Returns null for unknown, expired or revoked sessions — never
   * throws for those cases (deny-by-default).
   */
  async resolve(rawId: string | undefined): Promise<SessionRecord | null> {
    if (!rawId) return null;
    const key = this.digest(rawId);
    const now = this.clock();
    const res = await this.pool.query(
      `SELECT s.expires_at, s.absolute_expires_at, s.revoked_at,
              u.id, u.username, u.role
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.session_key = $1`,
      [key],
    );
    const row = res.rows[0];
    if (!row) return null;
    if (row.revoked_at !== null) return null;
    const expiresAt = row.expires_at as Date;
    const absoluteExpiresAt = row.absolute_expires_at as Date;
    // Enforce expiry BEFORE any extension (TEST-F01-08 boundary).
    if (now >= expiresAt || now >= absoluteExpiresAt) return null;

    // Sliding idle expiry: extend, but never beyond the absolute cap.
    const nextIdle = new Date(Math.min(
      now.getTime() + this.idleMinutes * 60_000,
      absoluteExpiresAt.getTime(),
    ));
    await this.pool.query(
      `UPDATE sessions SET expires_at = $2, last_seen_at = $3 WHERE session_key = $1`,
      [key, nextIdle, now],
    );
    return {
      user: { id: row.id, username: row.username, role: row.role },
      expiresAt: nextIdle,
      absoluteExpiresAt,
    };
  }

  /** Server-side revocation; returns false if the session never existed. */
  async revoke(rawId: string | undefined): Promise<boolean> {
    if (!rawId) return false;
    const res = await this.pool.query(
      `UPDATE sessions SET revoked_at = $2 WHERE session_key = $1 AND revoked_at IS NULL`,
      [this.digest(rawId), this.clock()],
    );
    return (res.rowCount ?? 0) > 0;
  }

  private digest(rawId: string): string {
    return createHash("sha256").update(rawId, "utf8").digest("hex");
  }
}

/** Constant-time equality helper for security-sensitive comparisons. */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
