# Sprint 1 Part F evidence pack — Issue #13 / F-10

**Date:** 10 November2026 (Asia/Bangkok). **State:** [release PR #42](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/42) is open from `sprint/1-staging` at candidate/tested source `d291873c10c2021d4eb5ebe733aa68012f813678` into `main` at `7bf6c8d7d1a220dbc05526c7b980fb31bde85d2c`. PR #38/F-10 was merged at `ef58fae`; PR #41 UI fixes and PR #43 CI are integrated. This is candidate evidence, not a main release or completed Product DoD. [verification.json](run/verification.json) and [setup.json](run/setup.json) identify the same clean source commit; an evidence-only descendant must preserve every recorded source fingerprint. Refs #6 #13.

Commit traceability (old raw runs are historical and recoverable at their evidence commits):

| Round | Source / submission | Evidence / reviewed head |
|---|---|---|
| Original submission | `2b76abb` | Original evidence; historical setup61.812s |
| First remediation | `8bff092` | `43bcdfe`; local PG18 setup22.417s |
| Second remediation | `8fb84f4c0803b12cbdd65275e4361a0aaeb88a23` | `0316500e9b6ca93cf477b83f04d986adaf7a67ed`; local PG18 setup23.746s |
| Historical PR38 corrections | `8676957c3dc40511508bfefb772576c6a4958e84` | `dad4cd8139034237c29f086a93c03a3305abf0e6`; historical164/70/54, setup38.044s |
| Current PR42 candidate | `d291873c10c2021d4eb5ebe733aa68012f813678` | Current `run/`;164/74/57, setup timing in `setup.json`; candidate includes PR #41/#43 |

The earlier independent re-review reports164/70/54 and5 tooling tests on `43bcdfe`, Node24.19.0/PostgreSQL17.11. The [earlier re-review](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/38#pullrequestreview-5807698601) targets historical head `0316500`, confirms both P2 fixes, reports164/70/54 and41 audit checks with8 pending gates, and requests documentation/CLI corrections. That review does not specify its toolchain versions. This is reviewer evidence, not a new local execution. The original61.812s, first remediation22.417s and reviewer's original11.957s are separate measurements.

Original `project_deliverable_1_v1.pdf` pp.5–7 (§3.6/§4.2) and `group_work_specs_v1.pdf` p.5 Theme2 were read from the supplied `lab-document/` directory. This pack supplies Part F source artifacts for the final self-contained A–F PDF; it does not claim the complete submission PDF has been assembled or submitted.

## Navigation for Part F assembly

| Required evidence | Artifact to embed/read |
|---|---|
| Version, actual build/test outcomes and limitations | This page and [verification.json](run/verification.json) |
| Normal persisted journey, rule rejection, identity/access | Scenarios/screenshots below; actual per-project [desktop](run/demo-desktop-chromium.json), [tablet](run/demo-tablet-chromium.json), [mobile](run/demo-mobile-chromium.json) records |
| Every AC → planned TEST → actual file/name → result | [Generated57-row AC results](run/ac-results.md), [reviewable mapping](../../../scripts/sprint1-ac-map.json) |
| Domain and security test excerpts; authentic TDD history | [test-excerpts.md](test-excerpts.md) |
| Issue/contract/branch/review/staging chains, both students, AI disclosure | [workflow-and-contributions.md](workflow-and-contributions.md), [verified metadata](workflow.json) |
| Setup timing and reproduction | [root README](../../../README.md), [setup.json](run/setup.json) |
| Human gates and proposed release | [release-handoff.md](release-handoff.md) |

For the PDF, embed the selected images, actual AC table and excerpts directly; external links alone are not the submission. Add actual page numbers to the A–F navigation after assembling the full document, and use the eventual reviewed release SHA throughout. Do not relabel this candidate's outputs as release-commit results.

## Actual automated results

| Command/check | Passed | Failed | Skipped | Evidence |
|---|---:|---:|---:|---|
| Server Vitest suite | 164 | 0 | 0 | [server.json](run/server.json), [log](run/server-tests.txt) |
| Client Vitest suite | 74 | 0 | 0 | [client.json](run/client.json), [log](run/client-tests.txt) |
| Playwright, desktop/tablet/mobile Chromium | 57 | 0 | 0 | [browser.json](run/browser.json), [log](run/browser-tests.txt); zero flaky cases |
| Server build, client typecheck/build | PASS | 0 | — | [server build](run/server-build.txt), [typecheck](run/client-typecheck.txt), [client build](run/client-build.txt) |
| Application AC mapping | 49/49 | 0 missing | 0 | All F-01–F-05 application AC map to executed passing cases; process approval is separate |
| Full contract mapping | 57 result rows | 0 missing | — | F-10 has3 PASS and5 PARTIAL rows because human/release requirements remain |
| Intentional isolated runner-failure probe | Expected failure observed | 1 deliberate assertion | 0 | [probe JSON](run/runner-failure-probe.json): nonzero exit; excluded from product-suite counts |
| Verification tooling regression | 12 | 0 | 0 | [helper-tests.txt](run/helper-tests.txt); executed on the same candidate source |

Environment: Windows, **Node24.15.0**, **PostgreSQL18.4**, Vitest5.1.0, Playwright1.64.1; exact timings/commands are in `verification.json`. Two temporary schemas are created inside the dedicated test DB, migrated before test discovery, and removed afterward. Browser seed passwords are generated privately per run. No dependency was added; lockfiles remain unchanged.

The49 new F-10 server cases include real production HTTP probes of every protected route for anonymous/invalid/expired/revoked sessions, wrong-role/owner manipulation, secure cookie attributes, actual seed reruns, and app-process restart with reauthentication and revoked-session replay. Including the route-inventory consistency test, this is **49 new cases** relative to the115-case F-05 suite. The exact runner total is164. Browser originally added three complete integrated journeys to the51-case F-05 suite; PR #41 adds three responsive layout cases, making57. The client suite is now74 after the loan-detail/checkout regression fixes. Historical70/54 results remain attributed to their earlier source commits.

The initial mapping audit rejected three stale name references although all suites passed; the mapping was corrected to actual reported names. Assertions were not weakened. A rehearsal attempt on an already seeded DB was not used for this issue's evidence; the F-10 runner deliberately provisions virgin schemas so stale credentials/data cannot manufacture a pass.

Local DB evidence is PostgreSQL18.4. PR #37's [reviewer](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/37#pullrequestreview-5804916583) separately reports115 server/70 client/51 browser passes on fresh PostgreSQL17.11 at `70e7b5e`. That verifies the earlier F-05 head in the reviewer's environment, **not** the new F-10 suite on PostgreSQL17. No combined/relabeled result is claimed.

## Demonstration scenarios — expected versus actual

All scenarios below run in `e2e/specs/sprint1-integration.spec.ts`, test `TEST-F10-01/02: complete UI/API/DB journey, exclusive rejection, ownership and logout`. Their starting state is a fresh browser-test schema with privately seeded B-A/B-B/C-A and a unique synthetic total1 item per viewport. They use real UI/API/PostgreSQL, with no intercepted business responses.

| Scenario / IDs | Role and steps | Expected | Actual |
|---|---|---|---|
| Normal request → checkout → own loan; F-01–F-05, AC-F10-01 | B-A logs in, opens catalog/item and submits qty1; B-B submits a competing qty1; C-A opens the submitted queue and checks out A; B-A logs in again and reloads own loan detail | Both requests201 without reserving stock; checkout201 creates one durable loan, request CHECKED_OUT, available0; returned API IDs/quantity/date equal fresh DB rows | PASS on all3 viewports; own detail survives reload; committed Loan and DB agree |
| Meaningful stock/duplicate rejection; AC-F05-02/03/04, AC-F10-02 | C-A repeats the fulfilled request, then uses the still-submitted competing request | Repeat409 ALREADY_CHECKED_OUT; stale competing checkout409 insufficient, no second loan or negative stock | PASS; UI shows conflict; fresh SQL count is exactly1 |
| Identity/access; AC-F01-04/05/06/08/09/12, AC-F10-02 | B-A tampers local role storage and calls checkout; logs out and replays the old cookie; B-B calls A's request/loan IDs and opens A's loan page | Trusted identity stays BORROWER; checkout403; logout replay401; foreign IDs403 without private data | PASS; safe forbidden UI recorded; API assertions enforce every denial |
| Durable restart; AC-F10-03, BR-11 | In `server/tests/sprint1-integration.test.ts`, snapshot actual request/loan/stock, log out A, stop production app, start new process on same DB, reject replay on every protected route, reauthenticate and read again | Identical persisted IDs/owner/item/quantities/dates/stock; no reset/reseed | PASS against actual `server/src/index.ts` processes |

Selected desktop evidence (equivalent tablet/mobile screenshots are retained under `run/screenshots/`):

**Borrower persisted request — F-04 / AC-F04-01/08.**

![Borrower persisted request](run/screenshots/desktop-chromium-borrower-request.png)

**Custodian committed checkout — F-05 / AC-F05-01/06/10.**

![Custodian committed active loan](run/screenshots/desktop-chromium-custodian-checkout.png)

**Meaningful unavailable-stock rejection — F-05 / AC-F05-02.**

![Unavailable checkout rejected](run/screenshots/desktop-chromium-stock-rejection.png)

**Borrower own loan after reload — F-05 / AC-F05-08.**

![Borrower persisted own loan](run/screenshots/desktop-chromium-borrower-loan.png)

**Forbidden cross-owner access — F-01/F-05 / AC-F01-09, AC-F05-08.**

![Cross-owner loan access denied](run/screenshots/desktop-chromium-cross-owner-forbidden.png)

**Logout returns to sign-in — F-01 / AC-F01-06/11.** Backend replay denial is separately asserted401.

![Sign-in after logout](run/screenshots/desktop-chromium-logout.png)

## Setup, concurrency and artifact audit

The [timed setup](run/setup.json) starts with installed Node/npm/PostgreSQL/tar, then uses a fresh source directory, fresh dev/test databases, actual `npm ci` for both packages, Chromium install/check, configuration, migrations, seed, builds and application startup. Seeded login200, catalog200 with3 items and the built React shell were checked. The latest actual duration and target check are in `setup.json`. The original historical run was61.812 seconds, below900 seconds; reruns are separate records, not relabeled as that original run. Host package/browser caches may be warm; this is not a fresh OS measurement. Other-student README repetition remains PENDING.

The full suite retains all50 independent distinct-request races plus one same-request race between two separate Node workers with separate DB pools and an IPC barrier. [races.json](run/races.json) records all51 outcomes, actual server version and worker PIDs. Every race has one201/one409 and verifies one loan, held1, available0. The F-05 after-insert barrier also verifies independent readers cannot see uncommitted stock consumption and rollback leaves no partial state.

Run `npm run rehearse:sprint1`, then `npm run verify:sprint1`, then `npm run audit:sprint1` on the same clean source commit using the root README prerequisites/configuration. The structural [audit](run/evidence-audit.json) checks recorded source fingerprints, counts, all57 AC rows, real Git ancestry/review metadata, screenshots, setup and race records. It supplements human assessment; file presence never proves substantive peer review or authenticity by itself. Native regression checks for canonical hashes, portable JSON/paths, dirty-source rejection and source-preserving descendant commits are in [scripts/tests/evidence.test.mjs](../../../scripts/tests/evidence.test.mjs). A strict release audit first requires committed, fingerprint-matching source. It exits1 for uncommitted/stale source, and exits2 (`NOT_RELEASED`) only after source validation succeeds but release/human gates remain absent; see [release audit](run/release-audit.json).

## Known gaps — not hidden by passing tests

- Observed main is the bootstrap `7bf6c8d`; staging/candidate is `d291873`. PR #38/F-10 is merged at `ef58fae`; release PR #42 is open and requires re-review of the evidence corrections. No main release/version regression is claimed.
- A-12 quantity/full-return policy is explicitly user-confirmed but still lacks a shared-team ratification artifact. The user identified L0u1sss as themself and Peepipat-Suesoongnuen as their teammate; that identity confirmation is not a ratification of the policy.
- Other-student README repetition, contribution/AI disclosure sign-off and human authenticity review of historical local RED evidence remain pending. RED commits are not invented.
- GitHub Project/board final status is NOT VERIFIED; available GitHub connector tools expose no Project reader, and no board state was changed. A final board/history screenshot must be supplied from the real board before submission.
- The actual catalog (OQ-01) remains open; all evidence uses synthetic items. Return/overdue/full history/reporting, Docker/CD/GCP, cross-team UAT and final video remain later work. CI is implemented in PR #43; required-check enforcement on main/staging is not yet verified.
- Assemble the self-contained Parts A–F PDF with real team names/student IDs and final release reference. The D1 deadline was8 November2026 23:59; this evidence pack does not claim a completed or on-time submission.

## Historical PR38 review remediation and provenance

The [independent PR38 review](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/38#pullrequestreview-5805879906) reports Node24.19.0/PostgreSQL17.11 verification of submitted head `2b76abb`:164 server,70 client,54 browser passes, build/typecheck/migrate:test PASS, and a warm-cache setup rehearsal of11.957s. These are reviewer-reported results for that head, separate from locally generated PG18 artifacts and the remediation candidate.

Process AC-F10-04/05/06/07/08 now resolve to TEST-F10-04/05/06/07/08/09/10 artifact/process checks (suite/failure probe/setup/TDD/workflow/release/disclosure), not repeated E2E journey names. Human gates remain PARTIAL. Canonical fingerprints normalize CRLF to LF; audit checks both the tested Git blobs and current source and permits a later evidence-only descendant commit with identical source. The latest source must be committed before the default runner can label it CLEAN_SOURCE_COMMIT. Regenerating and committing evidence afterward does not require pretending an evidence commit tested itself.

The retained runner requires clean setup evidence from exactly the verification source commit before starting suites. The audit independently checks this relationship and the complete fingerprint key set, including HTML/CSS/configs/assets. Missing tracked files are dirty source rather than an ENOENT crash. NOT_RELEASED is stored as a pending check with an empty matched list; it does not count as a passing release check. Full Git history is required; shallow clones fail with an actionable prerequisite message. CI was absent during these historical PR38 rounds; PR #43 subsequently implemented it. Required-check enforcement remains a separate administration step.

Second-remediation local round: clean source `8fb84f4c0803b12cbdd65275e4361a0aaeb88a23`, Node24.15.0/PostgreSQL18.4, setup23.746s;164 server,70 client,54 browser and11 tooling checks passed. Three real verifier preflight probes reject stale/candidate/missing-commit setup before any suite. Normal audit exits0 with41 structural checks; strict release audit exits2 NOT_RELEASED. The raw second-remediation records remain in historical evidence commit0316500. Current run/ files belong to the source SHA recorded by verification.json.

## Historical PR38 final corrections (superseded by the PR42 candidate run)

GitHub PR38 was observed at published head / evidence commit `dad4cd8` on7 November2026, preserving tested source `8676957`. The [latest review](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/38#pullrequestreview-5812473875) targets `dad4cd8`, confirms no outstanding P0/P1/P2, reports164/70/54 plus41 audit checks with8 pending gates, and requests only PR-body cleanup and explicit latest-head traceability. These are reviewer-reported local results, not a new local execution or GitHub CI. The local-only authorization of earlier agent work is distinct from subsequent repository publication. This round does not infer permission to push or edit GitHub. The user requested PR description updates in the chat rather than a repository draft file. Replace the complete PR body with the supplied chat text, removing the old appended Validation/Evidence paragraphs and duplicated Remaining gates section.

Working-tree candidate mode is removed: `verify:sprint1` accepts no options and `audit:sprint1` accepts only `--require-release`. Both reject unknown options explicitly. Required reproduction order is `rehearse:sprint1 -> verify:sprint1 -> audit:sprint1`, on the same clean source commit. A failed dirty-source report can still contain tested_commit=null, but it cannot pass verification or audit.

No retained raw artifact independently confirms the previously narrated tooling RED count of5 passed/5 failed; that claim is not treated as verified evidence. This is separate from existing F01/F05 domain/security TDD records. This round retains a new, specifically scoped CLI regression [RED log](tooling-option-red.txt) and [GREEN log](tooling-option-green.txt) for the removed working-tree option. These logs do not reconstruct or replace the missing historical RED run.

Historical local correction round: clean source `8676957c3dc40511508bfefb772576c6a4958e84`, Node24.15.0/PostgreSQL18.4; setup38.044s,164 server/70 client/54 browser and12 tooling tests passed, builds/typecheck PASS. Normal audit exit0 with41 checks and8 pending gates; strict release audit exit2 NOT_RELEASED. Historical setup.json and verification.json in evidence commit `dad4cd8139034237c29f086a93c03a3305abf0e6` name that same source SHA. Retrieve those records from Git at `dad4cd8:docs/verification/sprint-1/run/`; current `run/` is regenerated for `d291873`, not relabelled old evidence.

Retained one-off `run/audit-rejection-probes.json`, `run/setup-preflight-probes.json` and `run/source-guard-probe.json` are **historical tooling probes**, with their original source/version fields. They are not rerun by the normal F-10 sequence and do not establish candidate-level product results. In particular, the source-guard probe preserves an old CLI message mentioning the removed candidate option; current supported commands are the ones in README. Current candidate results are the regenerated setup, verification, suites/demo/races and normal/strict audit artifacts.

The user requested removal of PR-specific draft/review-summary files. Review facts remain attributed above to their GitHub reviews, while required raw run evidence, workflow.json, test excerpts, RED/GREEN logs and release handoff remain. No PR-specific draft/summary files are required by the audit or retained here.

## Current PR42 evidence correction

The [10 November review](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/42#pullrequestreview-5829522619) identifies stale PR38 evidence and release status. It reports two green hosted runs (`42654888341`, `42655734483`),164/74/57 product tests,49/49 application AC, setup25.367s and normal audit exit0 on `d291873`. These are reviewer-reported results, separate from the newly generated local Node24.15.0/PG18.4 `run/` artifacts and their own timing. This local round runs rehearsal then verification then normal/strict audit on that same clean source, preserves the full104-file source manifest including `e2e/specs/ui-layout.spec.ts` and `scripts/ci.mjs`, and updates release status without changing product code or declaring a main release. The exact local duration, AC totals, audit checks and pending human gates are recorded in the linked JSON. Updated evidence publication requires authorization; current-head CI/re-review and the main release/rerun are still required.

Actual local results for `d291873`: setup34.282s (target met),164 server/74 client/57 browser,12 tooling tests, builds/typecheck PASS; no failed/skipped/flaky product cases. Application AC49/49; contract rows52 PASS/5 PARTIAL. Normal audit exit0 with41 structural checks and7 pending gates; strict release audit exit2 `NOT_RELEASED`. The feature13 integration gate is now VERIFIED using PR #38 approval and merge metadata; the remaining human checks are not silently closed. The local timing is not the reviewer's25.367s measurement. No source code was changed in this evidence/docs round.
