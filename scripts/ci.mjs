/** PR regression checks; independent of the human release/evidence gates. */
import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createSanitizer, sanitizeArtifacts, writeEvidence, sourceState, sourceFingerprints, canonicalHash } from "./evidence-utils.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "ci-results");
await mkdir(out, { recursive: true });
const secrets = [process.env.CI_TEST_DATABASE_URL].filter(Boolean);
const scrub = createSanitizer(root, secrets);
const schemas = [];
let admin;
const report = { started_at: new Date().toISOString(), node: process.version,
  ...sourceState(root), source_sha256: sourceFingerprints(root),
  workflow_sha256: canonicalHash(await readFile(path.join(root, ".github/workflows/ci.yml"), "utf8")),
  event: process.env.GITHUB_EVENT_NAME ?? "local", steps: [], suites: {}, status: "FAIL" };

async function run(label, script, args = [], env = {}, cwd = root) {
  console.log(`[CI] ${label}`);
  const start = Date.now();
  const child = spawn(process.execPath, [path.resolve(root, script), ...args], {
    cwd, env: { ...process.env, ...env }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject); child.once("close", resolve);
  });
  await writeEvidence(path.join(out, `${label}.txt`), output, scrub);
  report.steps.push({ label, exit_code: code, duration_ms: Date.now() - start });
  if (code !== 0) throw new Error(`${label} failed (exit ${code}); see ${label}.txt`);
}

async function schemaUrl(label) {
  const schema = `ci_${label}_${randomUUID().replaceAll("-", "")}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  schemas.push(schema);
  const url = new URL(process.env.CI_TEST_DATABASE_URL);
  url.searchParams.set("options", `-c search_path=${schema}`);
  secrets.push(url.toString());
  return url.toString();
}

try {
  if (process.argv.length > 2) throw new Error("test:ci accepts no arguments");
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major !== 24 || minor < 15) throw new Error("Use Node.js 24.15+ in the selected Node24 line");
  if (!process.env.CI_TEST_DATABASE_URL) throw new Error("CI_TEST_DATABASE_URL is required; use a disposable test database");
  // Never fall back to .env or a developer database. Each suite gets a schema.
  admin = new pg.Pool({ connectionString: process.env.CI_TEST_DATABASE_URL });
  report.postgresql = (await admin.query("SHOW server_version")).rows[0].server_version;
  const serverUrl = await schemaUrl("server");
  const browserUrl = await schemaUrl("browser");
  const origin = "http://127.0.0.1:3187";
  const env = { CI: "true", DATABASE_URL: serverUrl, TEST_DATABASE_URL: serverUrl,
    PORT: "3187", APP_ORIGIN: origin, APP_TIMEZONE: "Asia/Bangkok",
    SESSION_IDLE_MINUTES: "60", SESSION_ABSOLUTE_MINUTES: "480",
    SESSION_COOKIE_NAME: "pew_session", SESSION_COOKIE_SECURE: "false",
    F05_RACE_EVIDENCE: path.join(out, "races.json") };
  await run("server-build", "node_modules/typescript/bin/tsc", [], env);
  await run("client-typecheck", "client/node_modules/typescript/bin/tsc", ["--noEmit"], env, path.join(root, "client"));
  await run("e2e-typecheck", "node_modules/typescript/bin/tsc", ["--project", "e2e/tsconfig.json", "--noEmit"], env);
  await run("client-build", "client/node_modules/vite/bin/vite.js", ["build"], env, path.join(root, "client"));
  await run("tooling-tests", "scripts/tests/evidence.test.mjs", [], env);
  // Migration before discovery enables relation-gated server tests.
  await run("server-migration", "node_modules/tsx/dist/cli.mjs", ["server/src/db/migrate.ts"], env);
  await run("server-tests", "node_modules/vitest/vitest.mjs", ["run", "--reporter=json", `--outputFile=${path.join(out, "server.json")}`], env);
  await run("client-tests", "client/node_modules/vitest/vitest.mjs", ["run", "--reporter=json", `--outputFile=${path.join(out, "client.json")}`], env, path.join(root, "client"));
  for (const name of ["server", "client"]) {
    const result = JSON.parse(await readFile(path.join(out, `${name}.json`), "utf8"));
    report.suites[name] = { passed: result.numPassedTests, failed: result.numFailedTests, skipped: result.numPendingTests };
    if (!result.numPassedTests || result.numFailedTests || result.numPendingTests) throw new Error(`${name} contains failed/skipped/empty tests`);
  }
  const browserEnv = { ...env, DATABASE_URL: browserUrl, TEST_DATABASE_URL: browserUrl,
    E2E_BASE_URL: origin, PLAYWRIGHT_JSON_OUTPUT_NAME: path.join(out, "browser.json") };
  for (const key of ["SEED_PASSWORD_BA", "SEED_PASSWORD_BB", "SEED_PASSWORD_CA"]) {
    browserEnv[key] = randomBytes(24).toString("hex"); secrets.push(browserEnv[key]);
  }
  await run("browser-migration", "node_modules/tsx/dist/cli.mjs", ["server/src/db/migrate.ts"], browserEnv);
  await run("browser-seed", "node_modules/tsx/dist/cli.mjs", ["server/src/db/seed.ts"], browserEnv);
  await run("browser-tests", "node_modules/@playwright/test/cli.js", ["test", "--config", "e2e/playwright.config.ts", "--reporter=json"], browserEnv);
  const browser = JSON.parse(await readFile(path.join(out, "browser.json"), "utf8"));
  report.suites.browser = { passed: browser.stats.expected, failed: browser.stats.unexpected,
    skipped: browser.stats.skipped, flaky: browser.stats.flaky };
  if (!browser.stats.expected || browser.stats.unexpected || browser.stats.skipped || browser.stats.flaky) throw new Error("Browser results contain failed/skipped/flaky/empty tests");
  report.status = "PASS";
} catch (error) {
  report.error = scrub(error.message);
  process.exitCode = 1;
} finally {
  if (admin) {
    for (const schema of schemas.reverse()) {
      try { await admin.query(`DROP SCHEMA ${schema} CASCADE`); }
      catch { report.status = "FAIL"; report.error = "Temporary schema cleanup failed"; process.exitCode = 1; }
    }
    await admin.end();
  }
  report.completed_at = new Date().toISOString();
  await writeEvidence(path.join(out, "summary.json"), report, scrub);
  await sanitizeArtifacts(out, scrub);
  console.log(`[CI] ${report.status}${report.error ? `: ${report.error}` : ""}; reports: ci-results/`);
}
