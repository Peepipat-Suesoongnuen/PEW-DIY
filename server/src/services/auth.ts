/**
 * Authentication service — login, logout, current-user (contract §3).
 *
 * Security obligations (AC-F01-01..12):
 * - Unknown user and wrong password share one generic 401 response (no
 *   enumeration) and perform comparable verification work (timing).
 * - Login payload is allow-listed; role/user/expiry overrides are rejected.
 * - Logout revokes server-side BEFORE reporting 204; replay fails (TEST-07).
 * - Current-user derives from trusted server session state only (TEST-04).
 */
import type { Pool } from "pg";
import { SessionStore, SessionUser } from "./session";
import { getDummyHash, verifyPassword } from "./password";

export interface LoginResult {
  ok: boolean;
  user?: SessionUser;
  rawSessionId?: string;
  expiresAt?: Date;
  errorCode?: "INVALID_CREDENTIALS" | "VALIDATION_ERROR";
}

export interface AuthUserRow {
  id: string;
  username: string;
  password_hash: string;
  role: "BORROWER" | "CUSTODIAN";
}

const ALLOWED_LOGIN_FIELDS = new Set(["username", "password"]);

export function validateLoginPayload(body: unknown): { valid: boolean; username?: string; password?: string } {
  if (typeof body !== "object" || body === null) return { valid: false };
  const obj = body as Record<string, unknown>;
  // Reject unknown/extra fields (mass-assignment defense — AC-F01-03).
  for (const key of Object.keys(obj)) {
    if (!ALLOWED_LOGIN_FIELDS.has(key)) return { valid: false };
  }
  const { username, password } = obj;
  if (typeof username !== "string" || typeof password !== "string") return { valid: false };
  if (username.length === 0 || password.length === 0) return { valid: false };
  return { valid: true, username, password };
}

export class AuthService {
  constructor(
    readonly pool: Pool,
    private readonly sessions: SessionStore,
  ) {}

  async login(body: unknown): Promise<LoginResult> {
    const validated = validateLoginPayload(body);
    if (!validated.valid || validated.username === undefined || validated.password === undefined) {
      return { ok: false, errorCode: "VALIDATION_ERROR" };
    }

    const { username, password } = validated;
    const res = await this.pool.query<AuthUserRow>(
      `SELECT id, username, password_hash, role FROM users WHERE username = $1`,
      [username],
    );
    const row = res.rows[0];

    if (!row) {
      // Timing equalization: verify against a dummy hash so response time is
      // comparable whether or not the user exists (AC-F01-02).
      await verifyPassword(await getDummyHash(), password);
      return { ok: false, errorCode: "INVALID_CREDENTIALS" };
    }

    const passwordOk = await verifyPassword(row.password_hash, password);
    if (!passwordOk) return { ok: false, errorCode: "INVALID_CREDENTIALS" };

    const user: SessionUser = { id: row.id, username: row.username, role: row.role };
    const { rawId, expiresAt } = await this.sessions.create(user.id);
    return { ok: true, user, rawSessionId: rawId, expiresAt };
  }

  async logout(rawSessionId: string | undefined): Promise<boolean> {
    // Revocation must complete server-side before success is reported.
    return this.sessions.revoke(rawSessionId);
  }

  async currentUser(rawSessionId: string | undefined): Promise<SessionUser | null> {
    const record = await this.sessions.resolve(rawSessionId);
    return record?.user ?? null;
  }
}
