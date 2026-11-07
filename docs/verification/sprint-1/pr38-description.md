## Summary

Verify the Sprint1 authentication, catalog/availability, borrowing request and checkout/active-loan increment (F01-F05) and prepare Part F evidence. Refs #13. This integration/evidence PR targets sprint/1-staging; it is not a Sprint1 release to main and does not close Issue13.

## Changes

- Exercise real UI/API/PostgreSQL journeys, authorization, restart durability and checkout races; map49 application AC and57 contract AC with77 planned STS IDs.
- Require successful clean setup evidence from exactly the verified source commit before any suite/DB connection.
- Validate complete product/test/tooling fingerprint key sets against tested Git blobs and current files, including HTML/CSS/config/assets and deleted tracked files.
- Remove working-tree candidate mode. Verification accepts no CLI options; audit accepts only --require-release. Unknown options fail explicitly; no override bypasses clean-source provenance.
- Keep NOT_RELEASED pending, disclose full-history prerequisites, separate local/reviewer measurements, and retain authentic scoped CLI RED/GREEN logs.

## Version and validation traceability

| Round | Tested source | Evidence / reviewed head | Local measurement |
|---|---|---|---|
| Original submission |2b76abb |2b76abb | Historical setup61.812s |
| First remediation |8bff092 |43bcdfe |164 server/70 client/54 browser,5 tooling; setup22.417s |
| Second remediation |8fb84f4 |0316500 |164 server/70 client/54 browser,11 tooling; setup23.746s |
| Current review corrections | Pending clean source commit | Pending regenerated evidence | Prior rows are historical and are not current execution |

Historical local full-suite results use Node24.15.0/PostgreSQL18.4; host caches may be warm and installed toolchain prerequisites are excluded from rehearsal timing. The original reviewer setup11.957s on2b76abb and PG17 results on43bcdfe are independent measurements. The latest independent review on0316500 reports164/70/54,41 audit checks and8 pending gates, confirms no remaining P0/P1/P2, and requests these five documentation/CLI corrections; its toolchain versions were not specified.

## Validation and reproduction

Use full Git history, the README toolchain, a clean source commit and a dedicated disposable TEST_DATABASE_URL. The test DB role needs CREATE DATABASE for rehearsal and CREATE SCHEMA for isolated suite schemas. Run in this order on the same clean source commit:

```powershell
npm run rehearse:sprint1
npm run verify:sprint1
npm run audit:sprint1
npm run audit:sprint1 -- --require-release
```

The runner migrates its new schemas before test discovery. A manual `migrate:test` step is not required for this complete runner. The final strict audit is expected to exit2 NOT_RELEASED until an actual reviewed main release and human evidence are supplied; this is not a passing release check. Unknown/removed options are rejected with exit1.

Machine-readable setup/verification records must name the same source commit. The final evidence-only descendant retains that tested source SHA. See docs/verification/sprint-1/README.md for counts, timings, screenshots, per-AC mapping and evidence identity. All49 application AC passed in the second remediation; contract coverage remains52 PASS/5 PARTIAL rather than treating human/release gates as passed.

The narrated historical tooling RED5-pass/5-fail run has no retained raw artifact and is unverified. New tooling-option-red.txt and tooling-option-green.txt retain the actual same-test0/1 then1/0 CLI regression observations; they do not establish the missing historical run.

## Remaining gates

A-12 shared-team ratification, teammate README repetition, historical RED authenticity/contribution/AI disclosure sign-off, final board evidence, independent re-review/integration, a separate reviewed staging-to-main release with regression on the actual release SHA, and final Parts A-F PDF remain pending. CI and branch protection are known gaps outside this correction scope. All test/audit results here are local verification, not GitHub CI checks. The human reviewer must independently re-review before merging.
