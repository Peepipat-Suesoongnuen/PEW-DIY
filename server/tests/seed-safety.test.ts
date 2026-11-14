import { describe, expect, it } from "vitest";
import { assertSeedAllowed } from "../src/db/seed-safety";

describe("production seed guard", () => {
  it("rejects seed execution when NODE_ENV is production", () => {
    expect(() => assertSeedAllowed({ NODE_ENV: "production" })).toThrow(
      "Seed is disabled when NODE_ENV=production",
    );
  });

  it("allows seed execution in development", () => {
    expect(() => assertSeedAllowed({ NODE_ENV: "development" })).not.toThrow();
  });

  it("rejects seed execution when NODE_ENV is unset", () => {
    expect(() => assertSeedAllowed({})).toThrow(
      "Seed requires NODE_ENV=development or NODE_ENV=test",
    );
  });

  it("rejects seed execution in an unrecognized environment", () => {
    expect(() => assertSeedAllowed({ NODE_ENV: "staging" })).toThrow(
      "Seed requires NODE_ENV=development or NODE_ENV=test",
    );
  });

  it("rejects production case-insensitively", () => {
    expect(() => assertSeedAllowed({ NODE_ENV: "Production" })).toThrow(
      "Seed is disabled when NODE_ENV=production",
    );
  });

  it("allows production seeding only for the explicit local Compose demo mode", () => {
    expect(() => assertSeedAllowed({
      NODE_ENV: "production",
      SEED_MODE: "local-compose-demo",
    })).not.toThrow();
  });

  it("rejects production seeding for any other or missing seed mode", () => {
    expect(() => assertSeedAllowed({
      NODE_ENV: "production",
      SEED_MODE: "development",
    })).toThrow("Seed is disabled when NODE_ENV=production");
    expect(() => assertSeedAllowed({ NODE_ENV: "production" })).toThrow(
      "Seed is disabled when NODE_ENV=production",
    );
  });
});
