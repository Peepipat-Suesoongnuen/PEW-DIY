import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, unlinkSync } from "node:fs";
import os from "node:os";
import * as evidence from "../evidence-utils.mjs";
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
test("evidence-only descendant HEAD is accepted only with matching source and tested Git blob", (t) => {
  // Use the recorded source/evidence descendant pair, with its complete manifest.
  const run = JSON.parse(readFileSync(path.join(root, "docs/verification/sprint-1/run/verification.json"), "utf8"));
  assert.equal(execFileSync("git", ["merge-base", "--is-ancestor", run.tested_commit, "HEAD"], { cwd: root }).length, 0);
  const work = fixture(t, "43bcdfe");
  const sha = execFileSync("git", ["rev-parse", "43bcdfe^"], { cwd: work, encoding: "utf8" }).trim();
  assert.ok(assertSourceVersion({ tested_commit: sha, version_kind: "CLEAN_SOURCE_COMMIT", source_sha256: evidence.sourceFingerprints(work) }, work));
});
test("dirty-source state never labels a working-tree candidate as a clean commit", () => {
  const state = sourceState(root);
  assert.equal(state.tested_commit, state.source_dirty_files.length ? null : state.head_commit);
  assert.equal(state.version_kind, state.source_dirty_files.length ? "WORKING_TREE_CANDIDATE" : "CLEAN_SOURCE_COMMIT");
});

function fixture(t, ref) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "pewdiy-evidence-test-"));
  t.after(() => {
    if (!dir.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(dir).startsWith("pewdiy-evidence-test-")) throw new Error("Unsafe test cleanup");
    rmSync(dir, { recursive: true, force: true });
  });
  const work = path.join(dir, "repo");
  // Existing history only: no synthetic commits, refs or changes in the user's repo.
  execFileSync("git", ["clone", "--quiet", "--shared", root, work], { stdio: "pipe", windowsHide: true });
  if (ref) execFileSync("git", ["checkout", "--quiet", "--detach", ref], { cwd: work, stdio: "pipe", windowsHide: true });
  return work;
}
test("setup must be clean, successful and from exactly the verification source commit", () => {
  const state = { tested_commit: "a".repeat(40), version_kind: "CLEAN_SOURCE_COMMIT" };
  const setup = { ...state, status: "LOCAL_REHEARSAL_PASS", target_met: true, duration_ms: 1000 };
  assert.doesNotThrow(() => evidence.assertSetupEvidence(setup, state));
  assert.throws(() => evidence.assertSetupEvidence({ ...setup, tested_commit: "b".repeat(40) }, state), /setup.*commit/i);
  assert.throws(() => evidence.assertSetupEvidence({ ...setup, version_kind: "WORKING_TREE_CANDIDATE" }, state), /setup.*clean/i);
  assert.throws(() => evidence.assertSetupEvidence({ ...setup, tested_commit: null }, state), /setup.*commit/i);
  assert.throws(() => evidence.assertSetupEvidence({ ...setup, duration_ms: 900001 }, state), /setup.*target/i);
});
test("edited HTML, stylesheet, asset and build configs are dirty source", (t) => {
  const work = fixture(t);
  for (const name of ["client/index.html", "client/tsconfig.json", "tsconfig.json", "client/src/styles/tokens.css"]) {
    const file = path.join(work, name), original = readFileSync(file);
    writeFileSync(file, Buffer.concat([original, Buffer.from("\nchanged\n")]));
    const state = sourceState(work);
    assert.equal(state.tested_commit, null, name);
    assert.ok(state.source_dirty_files.includes(name), name);
    writeFileSync(file, original);
  }
  writeFileSync(path.join(work, "client/src/new-asset.svg"), "<svg/>");
  assert.ok(sourceState(work).source_dirty_files.includes("client/src/new-asset.svg"));
});
test("deleted tracked source is reported dirty without ENOENT crash", (t) => {
  const work = fixture(t);
  unlinkSync(path.join(work, "client/index.html"));
  assert.ok(sourceState(work).source_dirty_files.includes("client/index.html"));
});
test("audit rejects omitted fingerprint keys, modified HTML and forged hashes", (t) => {
  const work = fixture(t), state = sourceState(work);
  const run = { ...state, source_sha256: evidence.sourceFingerprints(work) };
  assert.ok(assertSourceVersion(run, work));
  const omitted = { ...run.source_sha256 }; delete omitted["client/index.html"];
  assert.throws(() => assertSourceVersion({ ...run, source_sha256: omitted }, work), /key set/i);
  assert.throws(() => assertSourceVersion({ ...run, source_sha256: { ...run.source_sha256, "client/index.html": "0".repeat(64) } }, work), /Fingerprint differs/);
  writeFileSync(path.join(work, "client/index.html"), "changed");
  assert.throws(() => assertSourceVersion(run, work), /dirty source|fingerprint/i);
});
test("shallow history fails with a full-clone prerequisite message", (t) => {
  const work = fixture(t);
  assert.doesNotThrow(() => evidence.assertFullHistory(work));
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: work, encoding: "utf8" }).trim();
  writeFileSync(path.join(work, ".git/shallow"), head + "\n");
  assert.throws(() => evidence.assertFullHistory(work), /full.*history.*fetch --unshallow/i);
});
test("binary assets retain byte-exact fingerprints", () => {
  assert.notEqual(evidence.hashSource("client/src/asset.png", Buffer.from([13, 10])), evidence.hashSource("client/src/asset.png", Buffer.from([10])));
});
