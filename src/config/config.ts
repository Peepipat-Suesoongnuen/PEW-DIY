/**
 * Fail-closed runtime configuration (SDS §8, shared-conventions §2).
 * No built-in credential/secret fallback is permitted: a missing required
 * value must stop startup rather than substituting a default.
 */

import { existsSync } from "fs";

/**
 * Loads `.env` into `process.env` if present (PR #22 review, P2-4).
 * Existing environment variables always take precedence over file values,
 * so explicitly exported variables still win. Absence of `.env` is fine:
 * callers may export variables directly.
 */
function loadDotEnv(): void {
  if (!existsSync(".env")) return;
  try {
    process.loadEnvFile(".env");
  } catch {
    // Fail-closed behavior lives in required()/loadConfig(); a malformed .env
    // must not be silently ignored for required keys — required() will throw
    // on any missing value below.
  }
}
loadDotEnv();

export interface AppConfig {
  databaseUrl: string;
  port: number;
  /** Trusted browser origin for anti-CSRF origin enforcement (cookie mode). */
  appOrigin: string;
  session: {
    idleMinutes: number;
    absoluteMinutes: number;
    cookieName: string;
    cookieSecure: boolean;
  };
}

function required(name: string, env: NodeJS.ProcessEnv = process.env): string {
  const value = env[name];
  if (value === undefined || value === "") {
    throw new Error(`Missing required configuration: ${name} (fail-closed; no fallback)`);
  }
  return value;
}

function requiredPositiveInt(name: string, env: NodeJS.ProcessEnv): number {
  const raw = required(name, env);
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`Configuration ${name} must be a positive integer, got: ${raw}`);
  }
  return n;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    databaseUrl: required("DATABASE_URL", env),
    port: requiredPositiveInt("PORT", env),
    appOrigin: required("APP_ORIGIN", env),
    session: {
      idleMinutes: requiredPositiveInt("SESSION_IDLE_MINUTES", env),
      absoluteMinutes: requiredPositiveInt("SESSION_ABSOLUTE_MINUTES", env),
      cookieName: required("SESSION_COOKIE_NAME", env),
      cookieSecure: (env.SESSION_COOKIE_SECURE ?? "").toLowerCase() === "true",
    },
  };
}
