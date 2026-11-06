/** F-10: real suites, isolated schemas, machine-readable outcomes, no Git writes. */
import { spawn, execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import path from "node:path";
import os from "node:os";
import { pathToFileURL, fileURLToPath } from "node:url";
import net from "node:net";
import pg from "pg";
import { createSanitizer, sourceFingerprints, sourceState, assertSetupEvidence, assertFullHistory, sanitizeArtifacts, writeEvidence } from "./evidence-utils.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const relative = (p) => path.relative(root, p).replaceAll("\\", "/");
try { process.loadEnvFile(path.join(root, ".env")); } catch { /* explicitly exported env also works */ }
const out = path.resolve(root, process.env.VERIFICATION_OUTPUT_DIR ?? "docs/verification/sprint-1/run");
await mkdir(out, { recursive: true });
const secrets = [process.env.TEST_DATABASE_URL, process.env.DATABASE_URL].filter(Boolean);
const scrub = createSanitizer(root, secrets);
const report = { started_at: new Date().toISOString(), ...sourceState(root), node: process.version,
  steps: [], suites: {}, application_coverage: {}, readiness: "NOT_RELEASED", error: null };
const schemas = [];
let admin;
const node = (script, args = []) => [process.execPath, [path.resolve(root, script), ...args]];

async function run(label, command, args, env, cwd = root, allowedFailure = false) {
  console.log(`[F10] ${label}`);
  const started = Date.now();
  const proc = spawn(command, args, { cwd, env: { ...process.env, ...env }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  proc.stdout.on("data", (b) => { output += b.toString(); });
  proc.stderr.on("data", (b) => { output += b.toString(); });
  const timer = setTimeout(() => { proc.kill(); }, 300000);
  let exit;
  try { exit = await new Promise((resolve, reject) => { proc.once("error", reject); proc.once("close", resolve); }); }
  finally { clearTimeout(timer); }
  await writeEvidence(path.join(out, `${label}.txt`), output, scrub);
  const step = { label, command: scrub(["node", ...args].join(" ")),
    cwd: relative(cwd) || ".", exit_code: exit, duration_ms: Date.now() - started, log: `${label}.txt` };
  report.steps.push(step);
  if (exit !== 0 && !allowedFailure) throw new Error(`${label} failed (exit ${exit}); see ${label}.txt`);
  return step;
}
async function schemaUrl(label) {
  const name = `verify_s1_${label}_${randomUUID().replaceAll("-", "")}`;
  await admin.query(`CREATE SCHEMA ${name}`); schemas.push(name);
  const url = new URL(process.env.TEST_DATABASE_URL);
  url.searchParams.set("options", `-c search_path=${name}`);
  return url.toString();
}
async function failureHarness(env) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "pewdiy-f10-runner-"));
  try {
    await writeFile(path.join(dir, "vitest.config.mjs"), 'export default {test:{include:["failure.test.mjs"]}};\n');
    await writeFile(path.join(dir, "failure.test.mjs"), `import {test,expect} from ${JSON.stringify(pathToFileURL(path.join(root, "node_modules/vitest/dist/index.js")).href)};
      test("intentional F10 runner assertion",()=>expect("actual").toBe("expected"));\n`);
    const output = path.join(dir, "result.json");
    const step = await run("runner-failure-probe", ...node("node_modules/vitest/vitest.mjs", ["run", "--root", dir, "--config", path.join(dir, "vitest.config.mjs"), "--reporter=json", `--outputFile=${output}`]), env, root, true);
    const result = JSON.parse(await readFile(output, "utf8"));
    await writeEvidence(path.join(out, "runner-failure-probe.json"), result, scrub);
    if (step.exit_code === 0 || result.numFailedTests !== 1 || !result.testResults.some((f) => f.assertionResults.some((t) => t.title === "intentional F10 runner assertion" && t.status === "failed"))) {
      throw new Error("Runner failure probe did not demonstrate the intended failing assertion");
    }
    report.runner_failure_probe = { status: "PASS", observed_exit: step.exit_code, numFailedTests: result.numFailedTests,
      meaning: "isolated assertion failure propagates nonzero; never included in product suite" };
  } finally {
    if (!path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(dir).startsWith("pewdiy-f10-runner-")) throw new Error("Unsafe temporary path");
    await rm(dir, { recursive: true, force: true });
  }
}
function suiteCases(result) {
  return result.testResults.flatMap((file) => file.assertionResults.map((t) => ({ file: relative(path.resolve(file.name)), name: t.fullName, status: t.status })));
}
try {
  if (!report.tested_commit && !process.argv.includes("--allow-working-tree")) throw new Error("Source differs from HEAD; commit source before verification, or explicitly use --allow-working-tree for a non-commit candidate");
  assertFullHistory(root);
  // Fail closed before opening a DB connection or starting any suite.
  let setup;
  try { setup = JSON.parse(await readFile(path.join(out, "setup.json"), "utf8")); }
  catch { throw new Error("Setup evidence is missing or invalid; run rehearse:sprint1 before verify:sprint1 on this clean source commit"); }
  assertSetupEvidence(setup, report);
  report.setup_tested_commit = setup.tested_commit;
  if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required; use a dedicated disposable test database");
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major === 24 && minor < 15) throw new Error("Client jsdom requires Node24.15+; see README prerequisites");
  const port = Number(process.env.VERIFICATION_PORT ?? 3181);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid VERIFICATION_PORT");
  await new Promise((resolve, reject) => { const probe = net.createServer(); probe.once("error", reject); probe.listen(port, "127.0.0.1", () => probe.close(resolve)); });
  admin = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  report.postgresql = (await admin.query("SHOW server_version")).rows[0].server_version;
  const serverUrl = await schemaUrl("server"), browserUrl = await schemaUrl("browser");
  secrets.push(serverUrl, browserUrl);
  const origin = `http://127.0.0.1:${port}`;
  const env = { DATABASE_URL: serverUrl, TEST_DATABASE_URL: serverUrl, PORT: String(port), APP_ORIGIN: origin,
    APP_TIMEZONE: "Asia/Bangkok", SESSION_IDLE_MINUTES: "60", SESSION_ABSOLUTE_MINUTES: "480", SESSION_COOKIE_NAME: "pew_session",
    SESSION_COOKIE_SECURE: "false", VITE_CONFIG_NATIVE_IGNORE_WARNING: "true", F05_RACE_EVIDENCE: path.join(out, "races.json") };
  await failureHarness(env);
  await run("server-build", ...node("node_modules/typescript/bin/tsc"), env);
  await run("client-typecheck", ...node("client/node_modules/typescript/bin/tsc", ["--noEmit"]), env, path.join(root, "client"));
  await run("client-build", ...node("client/node_modules/vite/bin/vite.js", ["build"]), env, path.join(root, "client"));
  await run("server-migration", ...node("node_modules/tsx/dist/cli.mjs", ["server/src/db/migrate.ts"]), env);
  await run("server-tests", ...node("node_modules/vitest/vitest.mjs", ["run", "--reporter=json", `--outputFile=${path.join(out, "server.json")}`]), env);
  await run("client-tests", ...node("client/node_modules/vitest/vitest.mjs", ["run", "--reporter=json", `--outputFile=${path.join(out, "client.json")}`]), env, path.join(root, "client"));
  for (const suite of ["server", "client"]) {
    const result = JSON.parse(await readFile(path.join(out, `${suite}.json`), "utf8"));
    report.suites[suite] = { passed: result.numPassedTests, failed: result.numFailedTests, skipped: result.numPendingTests, cases: suiteCases(result) };
    if (!result.numPassedTests || result.numFailedTests || result.numPendingTests) throw new Error(`${suite} contains failed/skipped/empty cases`);
  }
  const browserEnv = { ...env, DATABASE_URL: browserUrl, TEST_DATABASE_URL: browserUrl, E2E_BASE_URL: origin,
    VERIFICATION_ARTIFACT_DIR: out, PLAYWRIGHT_JSON_OUTPUT_NAME: path.join(out, "browser.json") };
  for (const key of ["SEED_PASSWORD_BA", "SEED_PASSWORD_BB", "SEED_PASSWORD_CA"]) {
    browserEnv[key] = randomBytes(24).toString("hex"); secrets.push(browserEnv[key]);
  }
  await run("browser-migration", ...node("node_modules/tsx/dist/cli.mjs", ["server/src/db/migrate.ts"]), browserEnv);
  await run("browser-seed", ...node("node_modules/tsx/dist/cli.mjs", ["server/src/db/seed.ts"]), browserEnv);
  await run("browser-tests", ...node("node_modules/@playwright/test/cli.js", ["test", "--config", "e2e/playwright.config.ts", "--workers=3", "--reporter=json"]), browserEnv);
  const browser = JSON.parse(await readFile(path.join(out, "browser.json"), "utf8"));
  const cases = [];
  function walk(suites) {
    for (const s of suites) {
      for (const spec of s.specs ?? []) for (const t of spec.tests) cases.push({ file: "e2e/" + spec.file.replaceAll("\\", "/"), name: spec.title,
        project: t.projectName, status: t.status === "expected" ? "passed" : t.status, attempts: t.results.length });
      walk(s.suites ?? []);
    }
  }
  walk(browser.suites);
  report.suites.browser = { passed: browser.stats.expected, failed: browser.stats.unexpected, skipped: browser.stats.skipped, flaky: browser.stats.flaky, cases };
  if (browser.stats.unexpected || browser.stats.skipped || browser.stats.flaky || !browser.stats.expected) throw new Error("Browser results include failed/skipped/flaky/empty cases");
  const mapping = JSON.parse(await readFile(path.join(root, "scripts/sprint1-ac-map.json"), "utf8"));
  const actualIds = [];
  const plannedIds = new Set();
  for (const feature of ["01", "02", "03", "04", "05", "10"]) {
    const suffix = { "01": "authentication", "02": "equipment-catalog", "03": "equipment-availability", "04": "borrowing-request", "05": "checkout-active-loan", "10": "integration-verification" }[feature];
    const source = await readFile(path.join(root, `docs/sprints/sprint-1/f-${feature}-${suffix}.md`), "utf8");
    actualIds.push(...[...source.matchAll(/^\| (AC-F\d+-\d+) \|/gm)].map((m) => m[1]));
    for (const m of source.matchAll(/^\| (TEST-F\d+-\d+)\b/gm)) plannedIds.add(m[1]);
  }
  if (JSON.stringify([...actualIds].sort()) !== JSON.stringify(mapping.map((r) => r.ac).sort())) throw new Error("AC mapping does not exactly match contract definitions");
  const mappedPlanned = new Set(mapping.flatMap((r) => r.planned_tests ?? []));
  if (mapping.some((r) => !r.planned_tests?.length) || JSON.stringify([...plannedIds].sort()) !== JSON.stringify([...mappedPlanned].sort())) throw new Error("Planned STS mapping does not exactly match contract definitions");
  const workflow = JSON.parse(await readFile(path.join(root, "docs/verification/sprint-1/workflow.json"), "utf8"));
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const validWorkflow = workflow.sampled_features.length >= 2 && workflow.sampled_features.every((f) => {
    if (!f.merged || f.author === f.reviewer || f.review_state !== "APPROVED" || f.base !== "sprint/1-staging") return false;
    git("merge-base", "--is-ancestor", f.head_sha, f.merge_sha); git("merge-base", "--is-ancestor", f.merge_sha, report.head_commit); return true;
  });
  report.process_checks = {
    "TEST-F10-04": { status: "PASS", artifact: "verification.json", detail: `Actual suite counts checked; ${actualIds.length} AC and ${plannedIds.size} STS IDs exactly match definitions` },
    "TEST-F10-05": { status: report.runner_failure_probe.status, artifact: "runner-failure-probe.json", detail: `Intended isolated assertion failure returned exit ${report.runner_failure_probe.observed_exit}` },
    "TEST-F10-06": { status: setup.status === "LOCAL_REHEARSAL_PASS" && setup.target_met ? "PASS" : "FAIL", artifact: "setup.json", detail: `Local fresh-project rehearsal ${setup.duration_ms}ms; peer repetition pending` },
    "TEST-F10-07": { status: "PASS", artifact: "../test-excerpts.md", detail: "Actual excerpts and historical local RED records retained; human authenticity review pending" },
    "TEST-F10-08": { status: validWorkflow ? "PASS" : "FAIL", artifact: "../workflow.json", detail: "Independent feature review identities, staging paths and real Git ancestry checked; release chain pending" },
    "TEST-F10-09": { status: "NOT_RELEASED", artifact: "release-audit.json", detail: "Actual main release and release-version regression have not been supplied; strict audit remains required" },
    "TEST-F10-10": { status: "PASS", artifact: "../workflow-and-contributions.md", detail: "Both accounts and AI disclosure documented; human confirmation pending" },
  };
  for (const sha of ["288a1e3be3eb4689ff2e40a15379d1ed57684710", "70e7b5ef02b92b26745140f0485ad796ffbc52cc"]) git("cat-file", "-e", `${sha}^{commit}`);
  for (const doc of ["test-excerpts.md", "workflow-and-contributions.md"]) if ((await readFile(path.join(root, "docs/verification/sprint-1", doc), "utf8")).length < 100) throw new Error("Process evidence is absent");
  report.ac_results = mapping.map((row) => {
    const checks = row.checks.map((check) => check.kind === "process"
      ? { ...check, matched: report.process_checks[check.id]?.status === "PASS" ? [{ name: check.id + ": " + report.process_checks[check.id].detail, file: report.process_checks[check.id].artifact, status: "PASS" }] : [], pending_check: report.process_checks[check.id]?.status === "NOT_RELEASED" ? report.process_checks[check.id] : null }
      : { ...check, matched: report.suites[check.suite].cases.filter((t) => t.file.endsWith(check.file) && t.name.includes(check.name) && t.status === "passed") });
    const accounted = checks.every((c) => c.matched.length || (c.pending_check && row.pending?.length));
    return { ac: row.ac, planned_tests: row.planned_tests, status: !accounted ? "MISSING" : row.pending?.length ? "PARTIAL" : "PASS", pending: row.pending ?? [], checks };
  });
  const app = report.ac_results.filter((r) => !r.ac.startsWith("AC-F10"));
  report.application_coverage = { total: app.length, passed: app.filter((r) => r.status === "PASS").length,
    meaning: "executed behavioral checks mapped to F01-F05 application AC; excludes human process/release gates" };
  if (report.ac_results.some((r) => r.status === "MISSING")) throw new Error("AC map has missing executed checks");
  report.status = "AUTOMATED_CHECKS_PASS";
} catch (error) {
  report.status = "FAIL"; report.error = scrub(error instanceof Error ? error.message : error); process.exitCode = 1;
  console.error(report.error);
} finally {
  if (admin) {
    for (const name of schemas.reverse()) {
      if (!/^verify_s1_(server|browser)_[a-f0-9]{32}$/.test(name)) throw new Error("Invalid temporary schema");
      try { await admin.query(`DROP SCHEMA ${name} CASCADE`); } catch { report.cleanup = "INCOMPLETE"; report.status = "FAIL"; report.error = "Temporary schema cleanup failed"; process.exitCode = 1; }
    }
    await admin.end();
  }
  report.source_sha256 = sourceFingerprints(root);
  report.completed_at = new Date().toISOString();
  await writeEvidence(path.join(out, "verification.json"), report, scrub);
  if (report.ac_results) {
    const lines = ["# Sprint 1 actual AC results", "", `Version: ${report.version_kind}; tested source commit: ${report.tested_commit ?? "none (working-tree candidate)"}; baseline HEAD: ${report.head_commit}.`, "",
      "| AC | Planned STS | Result | Executed checks / evidence | Pending |", "|---|---|---|---|---|"];
    for (const r of report.ac_results) lines.push(`| ${r.ac} | ${r.planned_tests.join(", ")} | ${r.status} | ${[...new Set(r.checks.flatMap((c) => c.matched.map((m) => `${m.file}: ${m.name.replaceAll("|", "/")}`)))].join("; ")} | ${r.pending.join("; ")} |`);
    await writeFile(path.join(out, "ac-results.md"), lines.join("\n") + "\n");
  }
  await sanitizeArtifacts(out, scrub);
  console.log(`[F10] ${report.status}; evidence: ${relative(out)}/verification.json; release: ${report.readiness}`);
}
