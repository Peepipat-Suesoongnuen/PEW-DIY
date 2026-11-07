import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";

export const canonicalHash = (value) => createHash("sha256").update(String(value).replaceAll("\r\n", "\n")).digest("hex");
export const digestFile = (file) => canonicalHash(readFileSync(file, "utf8"));
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function createSanitizer(root, secrets = [], home = os.homedir(), temp = os.tmpdir()) {
  return function scrub(value) {
    let s = String(value);
    for (const secret of secrets.filter(Boolean)) s = s.replaceAll(secret, "[private configuration]");
    const replacements = [[pathToFileURL(root).href, "repo:"], [root + path.sep, ""], [root, "."], [temp, "[temp]"], [home, "[home]"]];
    for (const [prefix, target] of replacements) {
      for (const p of new Set([prefix, prefix.replaceAll("\\", "/"), prefix.replaceAll("/", "\\")])) {
        s = s.replace(new RegExp(escape(p), "gi"), target);
      }
    }
    s = s.replace(/(?<![\w])(?:[A-Z]:[\\/]+Users[\\/]+[^\\/\s"'<>]+|\/(?:home|Users)\/[^/\s"'<>]+)/gi, "[home]");
    s = s.replace(/(?<![\w])([A-Z]:[\\/][^\s"'<>),;]*)/gi, (match) => "[external]/" + match.replaceAll("\\", "/").split("/").at(-1));
    return s;
  };
}
export function sanitizeData(value, scrub) {
  if (typeof value === "string") return scrub(value);
  if (Array.isArray(value)) return value.map((v) => sanitizeData(v, scrub));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitizeData(v, scrub)]));
  return value;
}
export async function writeEvidence(file, value, scrub) {
  const text = typeof value === "string" ? scrub(value) : JSON.stringify(sanitizeData(value, scrub), null, 2);
  await writeFile(file, text.replaceAll("\r\n", "\n").replace(/[ \t]+$/gm, "").trimEnd() + "\n");
}
export async function sanitizeArtifacts(dir, scrub) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await sanitizeArtifacts(file, scrub);
    else if (/\.(json|txt|md)$/.test(entry.name)) {
      const text = await readFile(file, "utf8");
      await writeEvidence(file, entry.name.endsWith(".json") ? JSON.parse(text) : text, scrub);
    }
  }
}
const gitText = (root, ...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }).trim();
// All product/test/tooling trees, regardless of extension (HTML/CSS/assets included).
// Root build/package/environment configuration is included; documentation/evidence
// is excluded so that a source-preserving evidence commit can follow a tested commit.
const relevant = (name) => Boolean(name) && !/\.md$/i.test(name) &&
  (/^(server|client|e2e|scripts)\//.test(name) || !name.includes("/"));
export function sourceFiles(root, commit) {
  const lists = commit
    ? [gitText(root, "ls-tree", "-r", "--name-only", "-z", commit)]
    : [gitText(root, "ls-tree", "-r", "--name-only", "-z", "HEAD"), gitText(root, "ls-files", "-z"), gitText(root, "ls-files", "--others", "--exclude-standard", "-z")];
  return [...new Set(lists.flatMap((list) => list.split("\0")).filter(relevant))].sort();
}
export function hashSource(name, bytes) {
  return /\.(?:[cm]?js|tsx?|json|html|css|svg|txt|ya?ml)$|(?:^|\/)(?:\.env[^/]*|\.gitignore|\.gitattributes|\.npmrc)$/.test(name)
    ? canonicalHash(bytes.toString("utf8")) : createHash("sha256").update(bytes).digest("hex");
}
function currentHash(root, name) {
  try { return hashSource(name, readFileSync(path.join(root, name))); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
export function sourceFingerprints(root) {
  return Object.fromEntries(sourceFiles(root).map((name) => [name, currentHash(root, name)]));
}
export function assertFullHistory(root) {
  if (gitText(root, "rev-parse", "--is-shallow-repository") === "true") {
    throw new Error("Full Git history is required for workflow/TDD ancestry; use a full clone or git fetch --unshallow before rehearsal, verification and audit");
  }
}
export function assertSetupEvidence(setup, state) {
  if (setup.version_kind !== "CLEAN_SOURCE_COMMIT") throw new Error("Setup evidence must be from a clean source commit; rerun rehearse:sprint1");
  if (!state.tested_commit || !setup.tested_commit || setup.tested_commit !== state.tested_commit) throw new Error("Setup evidence commit must exactly match verification tested_commit; rerun rehearse:sprint1 on this source commit");
  if (setup.status !== "LOCAL_REHEARSAL_PASS" || setup.target_met !== true || !Number.isFinite(setup.duration_ms) || setup.duration_ms < 0 || setup.duration_ms > 900000) {
    throw new Error("Setup evidence did not pass the 15-minute target; rerun rehearse:sprint1");
  }
}
export function sourceState(root) {
  const dirty = [];
  for (const name of sourceFiles(root)) {
    let blob;
    try { blob = execFileSync("git", ["show", `HEAD:${name}`], { cwd: root, stdio: ["ignore", "pipe", "pipe"] }); } catch { dirty.push(name); continue; }
    if (currentHash(root, name) !== hashSource(name, blob)) dirty.push(name);
  }
  const head = gitText(root, "rev-parse", "HEAD");
  return { head_commit: head, tested_commit: dirty.length ? null : head,
    version_kind: dirty.length ? "WORKING_TREE_CANDIDATE" : "CLEAN_SOURCE_COMMIT",
    source_dirty_files: dirty.sort(), fingerprint_format: "SHA-256; text CRLF normalized to LF; binary assets byte-exact; complete product/test/tooling manifest" };
}
export function assertSourceVersion(run, root) {
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  if (!run.tested_commit) throw new Error("Verification source is an uncommitted candidate; commit source and rerun rehearse:sprint1 then verify:sprint1");
  const expected = sourceFiles(root, run.tested_commit || undefined);
  const actual = Object.keys(run.source_sha256 ?? {}).sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual) || JSON.stringify(sourceFiles(root)) !== JSON.stringify(actual)) {
    throw new Error("Source fingerprint key set is incomplete or differs from tested/current product files; rerun rehearsal and verification");
  }
  if (run.tested_commit && (run.version_kind !== "CLEAN_SOURCE_COMMIT" || sourceState(root).source_dirty_files.length)) throw new Error("Committed evidence requires clean source; dirty source detected relative to HEAD");
  if (run.tested_commit) {
    execFileSync("git", ["merge-base", "--is-ancestor", run.tested_commit, head], { cwd: root, stdio: "ignore" });
    for (const [name, hash] of Object.entries(run.source_sha256 ?? {})) {
      const blob = execFileSync("git", ["show", `${run.tested_commit}:${name}`], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
      if (hashSource(name, blob) !== hash) throw new Error("Fingerprint differs from tested source commit: " + name);
    }
  }
  if (!actual.length || !Object.entries(run.source_sha256).every(([name, hash]) => hash !== null && currentHash(root, name) === hash)) {
    throw new Error("Recorded source fingerprints do not match current source");
  }
  return head;
}
