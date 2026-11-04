# Sprint 1 Product Definition of Done

> **Revision:** 1 — 2026-11-05 | **Status:** Proposed completion checklist, no checks executed or approvals claimed
>
> Basis: `project_deliverable_1_v1.pdf` §3.5–§3.6/§4.2; `group_work_specs_v1.pdf` §7–§8; [AGENT.md](../../../AGENT.md) §11–§13; [Sprint Plan](../plan.md). This checklist defines future evidence; creating these contracts does not satisfy it.

## 1. Feature Completion

- [ ] The feature contract revision and all dependent decisions are approved before implementation. FR/BR/NFR and existing Issue AC mappings agree with Parts A–D; no unresolved gate is silently treated as a decision.
- [ ] Required behavior and UI/API/data changes exist and satisfy every applicable feature AC, including positive, negative, boundary, wrong-role and cross-owner cases. Record any intentionally inapplicable branch with its decision/evidence; never count it as a passing test.
- [ ] Planned unit/API-DB/UI-E2E checks have been implemented at appropriate levels. Real DB integration proves persistence/atomicity/ownership; UI visibility and mocked repositories alone are insufficient.
- [ ] Actual build/test evidence identifies command, environment/version, tested commit SHA, test file/name, PASS/FAIL/SKIPPED counts and expected/actual outcomes. Automated tests cover 100% of Sprint 1 AC as required by NFR-09, and the runner exits nonzero on failure. Manual process/evidence assessment supplements the machine-verifiable checks and is recorded separately; it cannot replace required automated behavior coverage or be counted as an automated pass.
- [ ] Meaningful domain/security rules have authentic RED → GREEN history: an assertion fails for the intended behavior before implementation/correction, then passes after it; the same case remains as regression coverage. Preserve commands/results/SHAs. Tool/setup failures do not count as RED behavior evidence, and no synthetic historical commits are invented.
- [ ] Source code, migrations, safe configuration examples, setup and test instructions match the implemented version. No secrets or real personal data enter Git, logs or submission material.
- [ ] The other student has completed substantive review of the latest commit; required checks pass. Any requested changes are resolved/re-reviewed. The author does not approve or merge their own PR; merge is performed by the human Reviewer under AGENT.md §12.3.
- [ ] The reviewed feature PR is integrated into `sprint/1-staging`; Issue/contract/commit/PR/test links are recorded and the human-authorized Issue/board state reflects evidence. No agent changes external status merely because checks pass.

## 2. Integrated Sprint 1 Product

- [ ] F-01–F-05 and F-10 are integrated; the release candidate completes catalog → Borrower request → Custodian checkout → persistent active loan → updated availability → Borrower own-loan read through UI/API/DB.
- [ ] Demonstrate valid/invalid login, current-user, logout and old-credential denial; unauthenticated, wrong-role and cross-borrower API denials; screenshots identify role, feature/AC, expected and actual result without exposing credentials.
- [ ] Demonstrate meaningful unavailable/duplicate-checkout rejection, real concurrency safety and injected-failure checkout rollback, with no partial loan/request/availability state.
- [ ] Catalog, requests, loans and availability read back identically after application stop/start using the same persistent store; restart verification does not reset/reseed the DB. Redeployment durability remains required when Lab 5 deployment exists.
- [ ] A fresh environment reaches the running seeded application using README alone in **≤15 minutes** (NFR-08), measured from the documented starting preconditions; record prerequisites, actual timing and any failure. Do not exclude undocumented manual setup to claim the target.
- [ ] Regression/build pass on the release candidate and assessed release SHA. If the merge creates a different release commit, verify that actual commit and record results; do not relabel candidate-only results as release results.
- [ ] [Verification matrix](verification-matrix.md) is supplemented with actual test files/results and evidence for every Sprint 1 application AC. Future S2/S3 work is allocated and disclosed, not falsely counted as implemented.

## 3. Release and Part F Evidence

- [ ] Record at least two real Issue → contract → branch → PR → substantive other-student review → staging integration chains, including relevant comments and corrections.
- [ ] Release through a separately reviewed `sprint/1-staging` → `main` PR; the human Reviewer performs merge. Record actual release commit/tag and validate the released version. No direct feature push to `main`, self-merge or fabricated tag is accepted.
- [ ] Evidence pack includes normal persisted journey, business-rule rejection, authentication/forbidden access, actual test/build output, AC→TEST→file/result mapping, two real test excerpts (domain and security/ownership), RED/GREEN history and workflow links.
- [ ] Both students' real contributions and AI-agent supervision are documented; AI-use declaration and known limitations are accurate. Distinguish executed automated tests from manual checks and failed/skipped/not-run work.
- [ ] D1 submission PDF contains Parts A–E in full plus Part F evidence, internal navigation, team/repository/release identification and contributions. The assembled PDF is later deliverable work; these Markdown contracts are its source.
- [ ] D1 targets **8 Nov 2026, 23:59** per Part D. Actual Docker/mandatory CI/GCP work is Lab 5 (**15 Nov**), not a prerequisite invented for the current documentation task. Preserve the later deployment/durability obligation and do not claim cloud setup exists.

## 4. Honest Status and Revision

**Feature-ready**, **integrated**, **released**, and **submission-ready** are distinct evidence states. Contract drafting and document checks cannot establish product test results, independent teammate approval or completion of Issue #5/#6. Failed required checks and unresolved decisions remain visible. A needed behavioral/spec change is versioned with its reason, impacted IDs, affected tests, approval reference and new verification evidence.

| Rev | Change | Basis |
|---|---|---|
| 1 — 2026-11-05 | Defined feature, product, release/evidence and honest-status completion requirements | Issue #5 AC-E-05; Issue #6/#13; original PDFs; AGENT.md; plan rev 3 |
