import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalHash, createSanitizer, sanitizeData, digestFile, assertSourceVersion, sourceState } from "../evidence-utils.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
test("canonical source hashes tolerate CRLF checkout conversion but detect content changes", () => {
  assert.equal(canonicalHash("line1\r\nline2\r\n"), canonicalHash("line1\nline2\n"));
  assert.notEqual(canonicalHash("line1\n"), canonicalHash("line2\n"));
});
test("portable artifacts remove mixed-slash workspace, home, cache and temp paths without corrupting JSON or web URLs", () => {
  const scrub = createSanitizer("D:\\Work\\Repo", ["private-token"], "C:\\Users\\Example", "C:\\Users\\Example\\Temp");
  const value = sanitizeData({ root: "D:/Work/Repo", file: "D:\\Work\\Repo\\server\\test.ts", home: "C:/Users/Example/cache/node.exe",
    temp: "C:\\Users\\Example\\Temp\\probe.json", url: "https://github.com/owner/repo/pull/38", secret: "private-token" }, scrub);
  assert.equal(value.root, "."); assert.equal(value.file, "server\\test.ts");
  assert.match(value.home, /^\[home\]/); assert.match(value.temp, /^\[temp\]/);
  assert.equal(value.url, "https://github.com/owner/repo/pull/38"); assert.equal(value.secret, "[private configuration]");
  assert.deepEqual(JSON.parse(JSON.stringify(value)), value);
  assert.doesNotMatch(JSON.stringify(value), /Example|[A-Z]:/);
});
test("candidate evidence cannot silently pass committed-source audit", () => {
  assert.throws(() => assertSourceVersion({ tested_commit: null, source_sha256: {} }, root), /uncommitted candidate/);
});
test("evidence-only descendant HEAD is accepted only with matching source and tested Git blob", () => {
  const file = "server/src/services/loan.ts";
  const baseline = execFileSync("git", ["rev-parse", "5b064ea^{commit}"], { cwd: root, encoding: "utf8" }).trim();
  assert.ok(assertSourceVersion({ tested_commit: baseline, source_sha256: { [file]: digestFile(path.join(root, file)) } }, root));
  assert.throws(() => assertSourceVersion({ tested_commit: baseline, source_sha256: { [file]: "0".repeat(64) } }, root), /Fingerprint differs/);
});
test("dirty-source state never labels a working-tree candidate as a clean commit", () => {
  const state = sourceState(root);
  assert.equal(state.tested_commit, state.source_dirty_files.length ? null : state.head_commit);
  assert.equal(state.version_kind, state.source_dirty_files.length ? "WORKING_TREE_CANDIDATE" : "CLEAN_SOURCE_COMMIT");
});
