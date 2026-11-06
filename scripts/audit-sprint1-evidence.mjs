/** Structural evidence audit; human review and a main release are separate gates. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertSourceVersion, createSanitizer, digestFile, writeEvidence, sanitizeArtifacts } from "./evidence-utils.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.resolve(root, process.env.VERIFICATION_OUTPUT_DIR ?? "docs/verification/sprint-1/run");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true }).trim();
const json = async (file) => JSON.parse(await readFile(file, "utf8"));
const digest = digestFile;
const scrub = createSanitizer(root);
const audit = { audited_at: new Date().toISOString(), audited_head: git("rev-parse", "HEAD"), checks: [], pending: [],
  audit_source_sha256: digest(fileURLToPath(import.meta.url)), status: "NOT_RUN" };
function check(label, condition) { audit.checks.push({ label, status: condition ? "PASS" : "FAIL" }); if (!condition) throw new Error(label); }
try {
  const run = await json(path.join(out, "verification.json"));
  const candidateAllowed = process.argv.includes("--allow-working-tree") && !process.argv.includes("--require-release");
  assertSourceVersion(run, root, candidateAllowed);
  audit.tested_commit = run.tested_commit;
  audit.version_kind = run.version_kind;
  check("Full runner succeeded on the recorded source version", run.status === "AUTOMATED_CHECKS_PASS");
  check("49/49 application AC have executed passing checks", run.application_coverage.total === 49 && run.application_coverage.passed === 49);
  check("57 unique contract AC have real result rows", run.ac_results.length === 57 && new Set(run.ac_results.map((r) => r.ac)).size === 57 && !run.ac_results.some((r) => r.status === "MISSING"));
  check("No failed/skipped/flaky product cases", Object.values(run.suites).every((s) => s.passed > 0 && !s.failed && !s.skipped && !s.flaky));
  check("Runner nonzero failure is an actual isolated assertion", run.runner_failure_probe.status === "PASS" && run.runner_failure_probe.observed_exit !== 0);
  check("Recorded source fingerprints match current files", Object.entries(run.source_sha256).every(([name, hash]) => digest(path.join(root, name)) === hash));
  const races = await json(path.join(out, "races.json"));
  check("51 actual two-process races preserve one success/one rejection", races.workers.length === 2 && races.workers[0] !== races.workers[1] && races.outcomes.length === 51 && races.outcomes.every((o) => o[0] === 201 && o[1] === 409));
  const setup = await json(path.join(out, "setup.json"));
  check("Local fresh-source/DB rehearsal meets 15-minute target", setup.status === "LOCAL_REHEARSAL_PASS" && setup.target_met && setup.duration_ms <= 900000);
  for (const project of ["desktop-chromium", "tablet-chromium", "mobile-chromium"]) {
    const demo = await json(path.join(out, `demo-${project}.json`));
    check(`${project}: actual integrated journey and backend denials`, demo.quantity_available === 0 && demo.outcomes.checkout === 201 && demo.outcomes.unavailable === 409 && demo.outcomes.crossOwner === 403 && demo.outcomes.logoutReplay === 401);
    for (const label of ["borrower-request", "custodian-checkout", "stock-rejection", "borrower-loan", "availability-zero", "cross-owner-forbidden", "logout"]) {
      const file = path.join(out, "screenshots", `${project}-${label}.png`);
      check(`${project}: ${label} PNG`, (await readFile(file)).subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
    }
  }
  const workflow = await json(path.join(root, "docs/verification/sprint-1/workflow.json"));
  for (const feature of workflow.sampled_features) {
    check(`PR${feature.pr}: independent author/reviewer and staging path`, feature.author !== feature.reviewer && feature.review_state === "APPROVED" && feature.merged && feature.base === "sprint/1-staging");
    git("cat-file", "-e", `${feature.head_sha}^{commit}`); git("cat-file", "-e", `${feature.merge_sha}^{commit}`);
    git("merge-base", "--is-ancestor", feature.head_sha, feature.merge_sha);
    git("merge-base", "--is-ancestor", feature.merge_sha, audit.audited_head);
  }
  check("At least two real Issue/PR/staging chains", workflow.sampled_features.length >= 2);
  for (const feature of workflow.sampled_features.filter((f) => f.pr !== 22)) git("merge-base", "--is-ancestor", workflow.contract_commit, feature.head_sha);
  for (const name of ["README.md", "test-excerpts.md", "workflow-and-contributions.md", "release-handoff.md"]) {
    check(`Part F ${name} exists`, (await readFile(path.join(root, "docs/verification/sprint-1", name), "utf8")).length > 100);
  }
  for (const sha of ["288a1e3be3eb4689ff2e40a15379d1ed57684710", "70e7b5ef02b92b26745140f0485ad796ffbc52cc"]) git("cat-file", "-e", `${sha}^{commit}`);
  audit.pending = Object.entries(workflow.human_checks).filter(([, value]) => value.status !== "VERIFIED" || !value.evidence).map(([name]) => name);
  audit.main_remote = git("ls-remote", "origin", "refs/heads/main").split(/\s+/)[0];
  const releaseRef = process.env.RELEASE_REF;
  if (releaseRef) {
    const release = git("rev-parse", "--verify", "--end-of-options", `${releaseRef}^{commit}`);
    check("Requested release is the tested remote main commit", release === audit.main_remote && release === run.tested_commit);
    audit.release_commit = release;
  } else {
    audit.release_commit = null;
    audit.pending.push("Actual main release commit and release-version rerun");
    if (process.argv.includes("--require-release")) throw new Error("Release gate: RELEASE_REF is absent; staging verification is not a main release");
  }
  if (process.argv.includes("--require-release") && audit.pending.length) throw new Error("Release gate: unresolved human evidence checks");
  // Public account attribution is in workflow.json; avoid republishing local
  // Git author display names/personal identifiers in rendered evidence.
  const history = git("log", "-8", "--date=iso-strict", "--format=%h %ad%n%s%n");
  await writeFile(path.join(out, "workflow-history.txt"), history + "\n");
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const esc = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    await page.setContent(`<html><body style="font:18px sans-serif;padding:30px;color:#172554"><h1>Actual local Git history — staging candidate</h1><p>Source: git log, captured by evidence audit. Not a GitHub UI screenshot.</p><pre style="font:16px monospace;white-space:pre-wrap">${esc(history)}</pre><p>Main release pending. Review links and sampled feature chains: workflow.json.</p></body></html>`);
    await mkdir(path.join(out, "screenshots"), { recursive: true });
    await page.screenshot({ path: path.join(out, "screenshots/workflow-history.png"), fullPage: true });
  } finally { await browser.close(); }
  audit.status = run.tested_commit ? "AUTOMATED_EVIDENCE_PASS_WITH_HUMAN_GATES" : "CANDIDATE_CHECKS_PASS_COMMIT_VERIFICATION_PENDING";
} catch (error) { audit.status = error.message.startsWith("Release gate:") ? "NOT_RELEASED" : "FAIL"; audit.error = error.message; process.exitCode = audit.status === "NOT_RELEASED" ? 2 : 1; }
await writeEvidence(path.join(out, process.argv.includes("--require-release") ? "release-audit.json" : "evidence-audit.json"), audit, scrub);
await sanitizeArtifacts(out, scrub);
console.log(JSON.stringify({ status: audit.status, checks: audit.checks.length, pending: audit.pending, error: audit.error }, null, 2));
