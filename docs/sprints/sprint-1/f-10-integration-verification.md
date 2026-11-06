# F-10 — Sprint 1 Integration and Verification Contract

> **Revision:** 2 — 2026-11-06 | **Contract approval:** Pending team baseline approval and peer review | **Implementation status:** Not implemented (Issue #13) | **Test status:** NOT RUN — all STS cases **PLANNED / NOT RUN** (no execution or release claimed)
>
> Implementation Issue: [#13 / D1-06.6](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/13), parent [#6](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/6).

## 1. Responsibility, Requirements and Dependencies

F-10 is the **named system responsibility** from [Part B](../../features.md): integration/verification of F-01–F-05, reproducible setup (NFR-08), test automation (NFR-09), and coordination of persistence evidence (BR-11/NFR-04-S1). It does not replace feature-level authorization or transaction enforcement. All F-01–F-05 contracts and their decision gates must be approved before their implementation; integrated tests run after real behavior exists. Part D [plan](../plan.md) and [Product DoD](product-dod.md) define review/staging/release obligations.

Review history carried forward: PR #15 added redeployment durability and split checkout-versus-return evidence by sprint; PR #17 explicitly tagged F-10's coordination role; PR #20 confirms D1 8 Nov and Lab 5 15 Nov, with the calendar policy gate before checkout contracts. No Docker/GCP, S2 return/overdue/search/history, S3 reports or final demo video is added to this contract's S1 implementation scope.

## 2. Integration Design and Layer Responsibilities

Run domain journey through real UI → API → migrated persistent database using separate Borrower/Custodian identities. Retain real domain/security failure cases, restart comparisons and actual result artifacts on the tested SHA. Tests use isolated synthetic fixtures and a controlled clock; no mock-only persistence claim or public fault-injection endpoint is accepted.

| Layer | Scope in F-10 |
|---|---|
| UI | Exercise existing F-01–F-05 pages and shared loading/empty/error states; no new product page |
| API | Call the complete [shared inventory](shared-conventions.md); no new product endpoint/payload |
| Data/migrations | Run F-01/F-02/F-04/F-05 migrations and approved seed; no new domain table or destructive production reset |
| Verification tooling | Later add real suite/runner, executable clean setup steps, coverage/result mapping and evidence audits once stack is selected; commands are not invented here |
| Evidence | Record actual files/results/SHAs and human reviews; proposed future location `docs/verification/sprint-1/` may be fixed during implementation |

Normal journey: seed → B-A login/current-user → catalog E-ONE available1 → request qty1 → own-request read → logout → C-A login → submitted queue → checkout → created active loan/availability0 → B-A login in separate identity context → own-loan reload/read. Rejection: R-ONE-B cannot checkout after stock is held; direct Borrower checkout and cross-owner request/loan reads are denied by backend. Restarts retain DB contents and require legitimate reauthentication under selected lifecycle.

**Runner behavior:** run all planned application AC tests, emit exact counts/identifiers, and exit nonzero if an assertion fails. Verify the runner's failure exit behavior in an isolated harness; never deliberately weaken or leave a failing test in a release suite. Coverage means behavioral tests actually execute and pass, not simply that this Markdown matrix has rows.

**Result record:** feature/requirement ID, contract revision, AC ID, TEST ID, actual test file/name, test level, command, environment/tool versions, tested commit, expected/actual, PASS/FAIL/SKIPPED/NOT RUN and evidence link. Process/evidence audits include real Git/PR metadata and human review; machine-readable presence alone does not prove a substantive teammate review. Record pending/failed/skipped cases explicitly and distinguish them from passed tests.

## 3. Acceptance Criteria

| ID | Observable outcome |
|---|---|
| AC-F10-01 | Integrated UI/API/DB journey creates a persistent request and active loan, shows updated availability and retrieves the same own records after reload. |
| AC-F10-02 | Integrated suite demonstrates meaningful stock/duplicate rejection, login/logout/current-user, anonymous/wrong-role/cross-owner denial, without private data or unauthorized writes. |
| AC-F10-03 | App stop/start with unchanged durable DB preserves catalog/requests/loans/availability exactly; no reset/reseed is performed to manufacture success. |
| AC-F10-04 | Automated tests cover 100% of Sprint 1 AC, with real executed results mapped to test files/contract IDs; the runner reports truthful counts and nonzero exit on failure. Process/evidence checks also receive machine-verifiable checks plus human assessment where required. |
| AC-F10-05 | From the documented fresh-environment prerequisites, README-only setup reaches a running seeded app in ≤15 minutes; timing and any missing/extra steps are recorded. |
| AC-F10-06 | Evidence contains authentic domain/security RED→GREEN versions and two actual test excerpts (domain + role/ownership) traceable to tests that execute on the assessed version. |
| AC-F10-07 | At least two real Issue→contract→branch→other-student-reviewed PR→staging chains and a reviewed staging→main release are traceable to actual SHAs; author self-approval/merge is not used. |
| AC-F10-08 | Actual release commit/tag identifies a verified running increment; README/results/Part F evidence and both-student contributions/AI-use disclosure agree with that version and disclose all incomplete/failed/skipped work. |

## 4. Software Test Specification

All rows are PLANNED / NOT RUN. Automated artifact checks supplement, rather than replace, human verification of reviews/contributions and authenticity. None is claimed implemented by this documentation issue.

| Test ID | Linked AC | Level | Preconditions / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-F10-01 | AC-F10-01 | Automated UI/E2E + API/DB | Clean approved fixtures; real selected stack; separate B-A/C-A browser contexts; qty1 approved | Execute complete §2 normal journey; compare response IDs and fresh DB rows | Consistent request→loan→availability state, correct own data after reload and no approval step |
| TEST-F10-02 | AC-F10-02 | Automated API/DB + selected UI/E2E | R-ONE-A/B and L-ONE; B-A/B-B/C-A; route inventory | Run stock/duplicate rejection and F-01 negative access/lifecycle cases; show selected forbidden/error UI | Correct401/403/409; no private contents/extra writes; real API evidence supports demo |
| TEST-F10-03 | AC-F10-03 | Automated integration/system | Snapshot catalog, requests, loans and derived stock after successful journey; retain same DB | Stop/start app only, reauthenticate, compare fresh API/DB state | Identical persisted IDs/ownership/quantities/dates/stock; no reset/reseed or data loss |
| TEST-F10-04 | AC-F10-04 | Automated suite + result audit | Approved AC/TEST inventory and actual implementation tests/results | Run full suite; resolve every AC to executed file/test/result; compare runner totals | 100% AC have required executed verification; zero missing/false-pass records; counts and SHA agree |
| TEST-F10-05 | AC-F10-04 | Automated runner/harness integration | Isolated verification harness with one deliberate failing assertion separate from release suite | Run failing harness, record exit/output; then clean passing suite | Failure exits nonzero and reports failure; clean suite reports actual passes; no suppression |
| TEST-F10-06 | AC-F10-05 | Automated setup/system + manual reproduction | Fresh environment with documented OS/network/tool prerequisites only; no precreated app DB/state | Execute exact README setup/migrate/seed/start commands with timer; other student repeats from README | Running seeded login/catalog in ≤15min; no undocumented step; record actual timings/outcomes |
| TEST-F10-07 | AC-F10-06 | Automated evidence/Git audit + manual review | Real RED/GREEN SHAs/logs for domain and security cases; actual test source | Validate referenced SHAs/files/tests/logs and compare same assertion before/after; inspect excerpts | Behavioral RED before correction and GREEN after; two authentic excerpts linked to executed tests, no invented history |
| TEST-F10-08 | AC-F10-07 | Automated Git/PR evidence audit + human review | At least two real Issue/feature/review/integration chains and release metadata | Validate linked commits/branches/PR authors/reviewers/merge paths; human reads substantive reviews | Correct staging route and independent review on actual latest commits; no self-approval/merge or fabricated chain |
| TEST-F10-09 | AC-F10-08 | Automated release regression + evidence audit; human release check | Actual main release SHA/tag, README and evidence pack | Reproduce/run regression against actual released SHA; validate tag/commit/result links; inspect disclosure | Released version passes required checks; all links/counts/statuses match; gaps honestly listed |
| TEST-F10-10 | AC-F10-06, AC-F10-08 | Automated artifact consistency audit + human assessment | Proposed contribution/AI disclosure and Part F artifacts now populated during implementation | Verify referenced real files/SHAs/tests exist; both students inspect attribution and expected/actual labels | No fabricated contribution/test result; domain/security/demo/build/TDD artifacts traceable; both students accounted for |

## 5. Product DoD and Release Handoff

Complete the [Product DoD](product-dod.md). Planned tests and evidence audits require actual commands/files after SDS-OQ-01; no toolchain is selected by this contract. Retain required checks and never count manual review or a skipped gate as a passing automated application test. On a different merge/release SHA, rerun applicable verification and record that actual SHA.

Feature work targets `sprint/1-staging`, followed by a separate reviewed release PR to `main`. Human Reviewer performs merges; no current instruction authorizes this contract-writing task to push, publish, review, merge or alter GitHub status. Real deployment/recreated-container read-back is Lab 5 after deployment exists, preserving BR-11/NFR-04 rather than dropping the obligation.

| Rev | Change | Basis |
|---|---|---|
| 1 — 2026-11-05 | Initial F-10 integrated journey, AC/STS, runner and evidence/release contract | Issue #5/#6/#13; Part B F-10; SRS NFR-08/09; PR #15/17/20; original PDFs §3.5/§3.6/§4.2 |
| 2 — 2026-11-06 | Documentation alignment (Issue #10 PR): status header split into Contract approval / Implementation / Test status; no contract text changed | Evidence-state review 2026-11-06 (no execution or release claimed) |
