import { describe, expect, it } from "vitest";
import { loadConfig, loadDatabaseConfig } from "../src/config/config";

/**
 * Configuration contract (Lab 5 deployment fix):
 * - Database-only processes (migration/seed jobs) run loadDatabaseConfig() and
 *   must not require HTTP/session settings. Cloud Run RESERVES PORT and refuses
 *   explicit values, so a job must never need it.
 * - The HTTP application still runs loadConfig() and stays fail-closed: PORT,
 *   APP_ORIGIN and the session settings remain mandatory for the API server.
 */

const DATABASE_URL = "postgresql://pewdiy@localhost:5432/pewdiy_test";

const FULL_HTTP_ENV: NodeJS.ProcessEnv = {
  DATABASE_URL,
  PORT: "3000",
  APP_ORIGIN: "http://localhost:3000",
  SESSION_IDLE_MINUTES: "60",
  SESSION_ABSOLUTE_MINUTES: "480",
  SESSION_COOKIE_NAME: "pew_session",
};

describe("loadDatabaseConfig (database-only processes: migrate/seed)", () => {
  it("succeeds with DATABASE_URL present and PORT absent", () => {
    expect(loadDatabaseConfig({ DATABASE_URL })).toEqual({ databaseUrl: DATABASE_URL });
  });

  it("does not require APP_ORIGIN or any session configuration", () => {
    const env: NodeJS.ProcessEnv = { DATABASE_URL, PORT: "" };
    expect(() => loadDatabaseConfig(env)).not.toThrow();
  });

  it("rejects a missing DATABASE_URL (fail-closed)", () => {
    expect(() => loadDatabaseConfig({})).toThrow(
      "Missing required configuration: DATABASE_URL",
    );
  });

  it("rejects an empty DATABASE_URL (no silent empty URL)", () => {
    expect(() => loadDatabaseConfig({ DATABASE_URL: "" })).toThrow(
      "Missing required configuration: DATABASE_URL",
    );
  });

  it("provides no built-in database URL fallback", () => {
    // Whatever else is configured, an absent DATABASE_URL must still throw.
    const env: NodeJS.ProcessEnv = {
      PORT: "3000",
      APP_ORIGIN: "http://localhost:3000",
      SESSION_IDLE_MINUTES: "60",
      SESSION_ABSOLUTE_MINUTES: "480",
      SESSION_COOKIE_NAME: "pew_session",
    };
    expect(() => loadDatabaseConfig(env)).toThrow(
      "Missing required configuration: DATABASE_URL",
    );
  });
});

describe("loadConfig (HTTP application) stays fail-closed", () => {
  it("accepts a complete configuration", () => {
    const config = loadConfig({ ...FULL_HTTP_ENV });
    expect(config.port).toBe(3000);
    expect(config.databaseUrl).toBe(DATABASE_URL);
    expect(config.appOrigin).toBe("http://localhost:3000");
  });

  it("still rejects a missing PORT", () => {
    expect(() => loadConfig({ ...FULL_HTTP_ENV, PORT: "" })).toThrow(
      "Missing required configuration: PORT",
    );
  });

  it("still rejects a missing APP_ORIGIN", () => {
    expect(() => loadConfig({ ...FULL_HTTP_ENV, APP_ORIGIN: "" })).toThrow(
      "Missing required configuration: APP_ORIGIN",
    );
  });

  it("still rejects missing session settings", () => {
    expect(() =>
      loadConfig({ ...FULL_HTTP_ENV, SESSION_IDLE_MINUTES: "" }),
    ).toThrow("Missing required configuration: SESSION_IDLE_MINUTES");
    expect(() =>
      loadConfig({ ...FULL_HTTP_ENV, SESSION_ABSOLUTE_MINUTES: "" }),
    ).toThrow("Missing required configuration: SESSION_ABSOLUTE_MINUTES");
    expect(() =>
      loadConfig({ ...FULL_HTTP_ENV, SESSION_COOKIE_NAME: "" }),
    ).toThrow("Missing required configuration: SESSION_COOKIE_NAME");
  });

  it("still rejects a missing DATABASE_URL", () => {
    expect(() => loadConfig({ ...FULL_HTTP_ENV, DATABASE_URL: "" })).toThrow(
      "Missing required configuration: DATABASE_URL",
    );
  });
});
