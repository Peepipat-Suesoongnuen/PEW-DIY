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
export function sourceState(root) {
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true }).trim();
  const files = [...git("ls-files", "-z").split("\0"), ...git("ls-files", "--others", "--exclude-standard", "-z").split("\0")]
    .filter((n) => /^(server\/|client\/(src\/|.*config)|e2e\/|scripts\/)|^(package(?:-lock)?\.json|client\/package(?:-lock)?\.json|vitest\.config\.ts)$/.test(n))
    .filter((n) => /\.(mjs|cjs|js|ts|tsx|json)$/.test(n));
  const dirty = [];
  for (const name of new Set(files)) {
    let blob;
    try { blob = execFileSync("git", ["show", `HEAD:${name}`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); } catch { dirty.push(name); continue; }
    if (canonicalHash(readFileSync(path.join(root, name), "utf8")) !== canonicalHash(blob)) dirty.push(name);
  }
  const head = git("rev-parse", "HEAD");
  return { head_commit: head, tested_commit: dirty.length ? null : head,
    version_kind: dirty.length ? "WORKING_TREE_CANDIDATE" : "CLEAN_SOURCE_COMMIT",
    source_dirty_files: dirty.sort(), fingerprint_format: "SHA-256 of UTF-8 source with CRLF normalized to LF" };
}
export function assertSourceVersion(run, root, allowCandidate = false) {
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  if (!run.tested_commit && !allowCandidate) throw new Error("Verification source is an uncommitted candidate; commit source and rerun verify:sprint1");
  if (run.tested_commit) {
    execFileSync("git", ["merge-base", "--is-ancestor", run.tested_commit, head], { cwd: root, stdio: "ignore" });
    for (const [name, hash] of Object.entries(run.source_sha256 ?? {})) {
      const blob = execFileSync("git", ["show", `${run.tested_commit}:${name}`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      if (canonicalHash(blob) !== hash) throw new Error("Fingerprint differs from tested source commit: " + name);
    }
  }
  if (!Object.keys(run.source_sha256 ?? {}).length || !Object.entries(run.source_sha256).every(([name, hash]) => digestFile(path.join(root, name)) === hash)) {
    throw new Error("Recorded source fingerprints do not match current source");
  }
  return head;
}
