import { readFileSync } from "fs";
import path from "path";
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

  it("allows local Compose seeding only with the explicit --local-compose-demo flag", () => {
    expect(() => assertSeedAllowed(
      { NODE_ENV: "production", SEED_MODE: "local-compose-demo" },
      ["--local-compose-demo"],
    )).not.toThrow();
  });

  it("rejects local Compose seeding when its flag is missing", () => {
    expect(() => assertSeedAllowed(
      { NODE_ENV: "production", SEED_MODE: "local-compose-demo" },
      [],
    )).toThrow("Seed mode local-compose-demo requires the explicit --local-compose-demo flag");
  });

  it("allows cloud demo seeding only with the explicit --cloud-demo flag", () => {
    expect(() => assertSeedAllowed(
      { NODE_ENV: "production", SEED_MODE: "cloud-demo" },
      ["--cloud-demo"],
    )).not.toThrow();
  });

  it("rejects cloud demo seeding when its flag is missing", () => {
    expect(() => assertSeedAllowed(
      { NODE_ENV: "production", SEED_MODE: "cloud-demo" },
      [],
    )).toThrow("Seed mode cloud-demo requires the explicit --cloud-demo flag");
  });

  it("does not accept one mode's flag for the other mode", () => {
    expect(() => assertSeedAllowed(
      { NODE_ENV: "production", SEED_MODE: "local-compose-demo" },
      ["--cloud-demo"],
    )).toThrow("Seed mode local-compose-demo requires the explicit --local-compose-demo flag");
    expect(() => assertSeedAllowed(
      { NODE_ENV: "production", SEED_MODE: "cloud-demo" },
      ["--local-compose-demo"],
    )).toThrow("Seed mode cloud-demo requires the explicit --cloud-demo flag");
  });

  it("rejects production seeding for any other or missing seed mode", () => {
    expect(() => assertSeedAllowed({
      NODE_ENV: "production",
      SEED_MODE: "development",
    }, ["--cloud-demo", "--local-compose-demo"])).toThrow(
      "Seed is disabled when NODE_ENV=production",
    );
    expect(() => assertSeedAllowed(
      { NODE_ENV: "production" },
      ["--local-compose-demo"],
    )).toThrow("Seed is disabled when NODE_ENV=production");
  });

  it("does not require a flag outside production", () => {
    expect(() => assertSeedAllowed({ NODE_ENV: "development", SEED_MODE: "cloud-demo" }, []))
      .not.toThrow();
    expect(() => assertSeedAllowed({ NODE_ENV: "test", SEED_MODE: "local-compose-demo" }, []))
      .not.toThrow();
  });
});

describe("env template hygiene", () => {
  const envExample = readFileSync(path.resolve(process.cwd(), ".env.example"), "utf8");
  const composeYml = readFileSync(path.resolve(process.cwd(), "docker-compose.yml"), "utf8");

  const valueOf = (key: string): string | undefined => {
    const line = envExample.split("\n").find((l) => l.trimStart().startsWith(`${key}=`));
    return line?.slice(line.indexOf("=") + 1).trim();
  };

  it("ships no usable POSTGRES_PASSWORD in .env.example", () => {
    // A copy of the template must not start the stack with a publicly known
    // credential: the value stays empty until the user sets their own.
    expect(valueOf("POSTGRES_PASSWORD")).toBe("");
  });

  it("ships no usable SEED_PASSWORD_* values in .env.example", () => {
    for (const key of ["SEED_PASSWORD_BA", "SEED_PASSWORD_BB", "SEED_PASSWORD_CA"]) {
      expect(valueOf(key)).toBe("");
    }
  });

  it("keeps Compose failing closed on an unset or empty POSTGRES_PASSWORD", () => {
    // `${POSTGRES_PASSWORD:?...}` rejects both unset and empty, so the empty
    // template value and the Compose fail-closed contract agree.
    expect(composeYml).toContain("${POSTGRES_PASSWORD:?");
  });
});
