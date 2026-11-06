/** Timed README setup rehearsal in a fresh source directory and fresh DBs. */
import { spawn, execFileSync } from "node:child_process";
import { mkdir, mkdtemp, copyFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { once } from "node:events";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
try { process.loadEnvFile(path.join(root, ".env")); } catch { /* optional */ }
const out = path.resolve(root, process.env.VERIFICATION_OUTPUT_DIR ?? "docs/verification/sprint-1/run");
await mkdir(out, { recursive: true });
const report = { tested_commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(), node: process.version,
  status: "NOT_RUN", steps: [], starting_conditions: "Windows/Node/npm/PostgreSQL/tar installed; new source directory and application DBs; host package/browser caches may be warm",
  other_student_reproduction: "PENDING", started_at: new Date().toISOString() };
let temp, admin, child;
const names = [];
const secrets = [process.env.TEST_DATABASE_URL].filter(Boolean);
const scrub = (s) => secrets.reduce((a, b) => a.replaceAll(b, "[private configuration]"), String(s));
async function command(label, executable, args, cwd, env) {
  const started = Date.now(); console.log(`[setup] ${label}`);
  const proc = spawn(executable, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  let output = ""; proc.stdout.on("data", (d) => { output += d; }); proc.stderr.on("data", (d) => { output += d; });
  const timer = setTimeout(() => proc.kill(), 300000);
  let code;
  try { code = await new Promise((resolve, reject) => { proc.once("error", reject); proc.once("close", resolve); }); }
  finally { clearTimeout(timer); }
  await writeFile(path.join(out, `setup-${label}.txt`), scrub(output));
  report.steps.push({ label, exit_code: code, duration_ms: Date.now() - started });
  if (code !== 0) throw new Error(`${label} failed; see setup-${label}.txt`);
}
try {
  if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL to a disposable test database is required; its owner must allow CREATE DATABASE for this rehearsal");
  const npmCli = process.env.NPM_CLI_PATH ?? (process.env.npm_execpath ? path.join(path.dirname(process.env.npm_execpath), "npm-cli.js") : "");
  if (!npmCli || !existsSync(npmCli)) throw new Error("Run via npm run rehearse:sprint1 or supply NPM_CLI_PATH for the installed npm CLI");
  admin = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  report.postgresql = (await admin.query("SHOW server_version")).rows[0].server_version;
  const start = Date.now();
  temp = await mkdtemp(path.join(os.tmpdir(), "pewdiy-f10-setup-"));
  const work = path.join(temp, "source"); await mkdir(work);
  const archive = path.join(temp, "source.tar");
  execFileSync("git", ["archive", "--format=tar", "HEAD", "--output", archive], { cwd: root, windowsHide: true });
  execFileSync("tar", ["-xf", archive, "-C", work], { windowsHide: true });
  const changed = execFileSync("git", ["diff", "--name-only"], { cwd: root, encoding: "utf8" }).split(/\r?\n/);
  const added = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" }).split(/\r?\n/);
  for (const name of new Set([...changed, ...added])) {
    if (!name || name.startsWith("docs/verification/") || !existsSync(path.join(root, name))) continue;
    const target = path.resolve(work, name);
    if (!target.startsWith(path.resolve(work) + path.sep)) throw new Error("Unsafe source path");
    await mkdir(path.dirname(target), { recursive: true }); await copyFile(path.join(root, name), target);
  }
  const urls = [];
  for (const label of ["dev", "test"]) {
    const name = `verify_setup_${label}_${randomBytes(8).toString("hex")}`;
    await admin.query(`CREATE DATABASE ${name}`); names.push(name);
    const url = new URL(process.env.TEST_DATABASE_URL); url.pathname = "/" + name; url.search = "";
    urls.push(url.toString()); secrets.push(url.toString());
  }
  const port = Number(process.env.SETUP_REHEARSAL_PORT ?? 3191);
  const env = { ...process.env, DATABASE_URL: urls[0], TEST_DATABASE_URL: urls[1], PORT: String(port), APP_ORIGIN: `http://127.0.0.1:${port}`,
    APP_TIMEZONE: "Asia/Bangkok", SESSION_IDLE_MINUTES: "60", SESSION_ABSOLUTE_MINUTES: "480", SESSION_COOKIE_NAME: "pew_session", SESSION_COOKIE_SECURE: "false" };
  for (const key of ["SEED_PASSWORD_BA", "SEED_PASSWORD_BB", "SEED_PASSWORD_CA"]) { env[key] = randomBytes(24).toString("hex"); secrets.push(env[key]); }
  const keys = ["DATABASE_URL", "TEST_DATABASE_URL", "PORT", "APP_ORIGIN", "APP_TIMEZONE", "SESSION_IDLE_MINUTES", "SESSION_ABSOLUTE_MINUTES", "SESSION_COOKIE_NAME", "SESSION_COOKIE_SECURE", "SEED_PASSWORD_BA", "SEED_PASSWORD_BB", "SEED_PASSWORD_CA"];
  await writeFile(path.join(work, ".env"), keys.map((key) => `${key}=${env[key]}`).join("\n") + "\n");
  await command("root-ci", process.execPath, [npmCli, "ci", "--no-audit"], work, env);
  await command("client-ci", process.execPath, [npmCli, "ci", "--no-audit"], path.join(work, "client"), env);
  await command("chromium", process.execPath, [path.join(work, "node_modules/@playwright/test/cli.js"), "install", "chromium"], work, env);
  for (const label of ["migrate", "seed", "build", "build:client"]) await command(label.replace(":", "-"), process.execPath, [npmCli, "run", label], work, env);
  child = spawn(process.execPath, ["--import", "tsx", "server/src/index.ts"], { cwd: work, env, windowsHide: true, stdio: "ignore" });
  const deadline = Date.now() + 15000;
  let cookie;
  while (Date.now() < deadline && child.exitCode === null) {
    try {
      const login = await fetch(env.APP_ORIGIN + "/api/auth/login", { method: "POST", headers: { Origin: env.APP_ORIGIN, "Content-Type": "application/json" }, body: JSON.stringify({ username: "B-A", password: env.SEED_PASSWORD_BA }) });
      if (login.status === 200) { cookie = login.headers.get("set-cookie").split(";")[0]; break; }
    } catch { /* application starting */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!cookie) throw new Error("Seeded application login failed");
  const catalog = await fetch(env.APP_ORIGIN + "/api/equipment", { headers: { Cookie: cookie } });
  const body = await catalog.json();
  const shell = await fetch(env.APP_ORIGIN + "/login", { headers: { Accept: "text/html" } });
  if (catalog.status !== 200 || body.data.length !== 3 || !shell.ok || !(await shell.text()).includes('type="module"')) throw new Error("Seeded catalog or built app shell failed");
  report.duration_ms = Date.now() - start; report.target_ms = 900000;
  report.target_met = report.duration_ms <= report.target_ms;
  report.checks = { login: 200, catalog: 200, seeded_items: body.data.length, built_react_shell: true };
  report.status = report.target_met ? "LOCAL_REHEARSAL_PASS" : "TIMING_TARGET_FAILED";
  if (!report.target_met) process.exitCode = 1;
} catch (error) { report.status = "FAIL"; report.error = scrub(error.message); process.exitCode = 1; console.error(report.error); }
finally {
  if (child && child.exitCode === null) { const exited = once(child, "exit"); child.kill(); await exited; }
  if (admin) {
    for (const name of names) {
      if (!/^verify_setup_(dev|test)_[a-f0-9]{16}$/.test(name)) throw new Error("Unsafe rehearsal DB name");
      try { await admin.query(`DROP DATABASE ${name} WITH (FORCE)`); } catch { report.database_cleanup = "INCOMPLETE"; process.exitCode = 1; }
    }
    await admin.end();
  }
  if (temp) {
    const resolved = path.resolve(temp);
    if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(temp).startsWith("pewdiy-f10-setup-")) throw new Error("Unsafe rehearsal path");
    await rm(resolved, { recursive: true, force: true });
  }
  report.completed_at = new Date().toISOString();
  await writeFile(path.join(out, "setup.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(`[setup] ${report.status}; other-student repetition remains pending`);
}
