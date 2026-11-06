# Sprint 1 Engineering Contracts — Part E

> **Project:** PEW-DIY | **Issue:** [#5 / D1-05](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/5)
>
> **Revision:** 1 — 2026-11-05 | **Status:** Local draft for team decisions and independent peer review
>
> **Source baseline:** `c78ad95` — SRS rev 2, Part B rev 1, System SDS rev 2, Sprint Plan rev 3. English follows SRS A-07. No application code/tests, executed results, approved contract baseline or release is supplied by this documentation change.

Current execution update (2026-11-07): F-05 is implemented locally; see [F-05 evidence](tdd-evidence-f05.md) for 115 server, 70 client and 51 browser passes. The revision1 source/status wording above records initial contract authoring, not the current implementation state. Shared-baseline review, team ratification and release remain pending.

Current F-10 verification (Issue #13, 7 November2026): [Part F evidence](../../verification/sprint-1/README.md) records164 server,70 client and54 browser passes with49/49 application AC and57 total AC result rows. Human/process criteria and the main release remain partial/pending. This supplements the historical F-05-only snapshot above.

## 1. Purpose and Authoritative Sources

These contracts elaborate Sprint 1 before implementation: feature identity/requirements, design/workflow/rules, UI/API/data specifications, observable AC, Software Test Specification (STS), Product DoD and revision history. `project_deliverable_1_v1.pdf` §3.5 (PDF p.4) and `group_work_specs_v1.pdf` §7/§8.2 (PDF pp.9–10) define that obligation. Original PDFs were read from the team's local `D:/Software_Engineering/PEW-DIY/lab-document/` directory; no copies are added to Git.

Read the [SRS](../../srs.md), [Feature Inventory](../../features.md), [Traceability](../../traceability.md), [System SDS](../../system-sds.md), [Sprint Plan](../plan.md) and [repository instructions](../../../AGENT.md) as the upstream sources. Requirements are referenced by stable ID, not redefined in this directory. Detailed proposed wire contracts live here; actual runtime/schema commands remain contingent on the selected stack.

| Prior PR checked, including discussions | Decision or correction carried forward |
|---|---|
| [#15 — SRS](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/15) | Seven-day due-date assignment in S1; quantity invariant; return close-accounting; restart/redeployment persistence split; OQ-02 quantity/partial-return coupling |
| [#16 — Part B](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/16) | F-01–F-05 and F-10 are S1; F-10 is a named responsibility; S2/S3 feature allocation is retained |
| [#17 — SDS](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/17) | Borrower-only request creation agreed for current scope; F-10 tag/coordination; stack/auth remain open and a merged draft is not AC-C-01/04 completion |
| [#19 — AGENT reconciliation](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/19) | Already decided due-date/exclusive-item rules are not reopened; genuine OQ-01/OQ-02 remain open |
| [#20 — Sprint Plan](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/pull/20) | D1=8 Nov, Lab5=15 Nov; false schedule-conflict claim withdrawn; SDS-OQ-03 is a checkout contract/test gate; FR-19 remains S2 |

Issue #5/#6 and #8–#13 were read for identity/scope/AC alignment. Older Issue #6 text still excludes all due-date rules and describes IDs as unknown; the merged SRS/Part B/Plan and Issue #12 clarification supersede those snapshots. Contracts retain S1 due-date assignment and real F-xx mappings without changing Issue bodies. Approval remains absent under Direct Checkout; no cancellation, return, search or reporting capability is added.

## 2. Contract Index and Feature-to-Issue Alignment

| Feature / responsibility | Implementation issue | Feature contract | Dependencies |
|---|---|---|---|
| F-01 Authentication/RBAC | [#8 / D1-06.1](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/8) | [Authentication](f-01-authentication.md) | Approved stack/auth design |
| F-02 Seed/read catalog | [#9 / D1-06.2](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/9) | [Equipment Catalog](f-02-equipment-catalog.md) | F-01 |
| F-03 Availability | [#10 / D1-06.3](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/10) | [Equipment Availability](f-03-equipment-availability.md) | F-01/F-02; F-05 owns checkout writes |
| F-04 Borrowing Request | [#11 / D1-06.4](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/11) | [Borrowing Request](f-04-borrowing-request.md) | F-01/F-02/F-03 |
| F-05 Checkout/Active Loan | [#12 / D1-06.5](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/12) | [Checkout and Active Loan](f-05-checkout-active-loan.md) | F-01–F-04; quantity/calendar gates |
| F-10 Integration/Verification | [#13 / D1-06.6](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/13) | [Integration and Verification](f-10-integration-verification.md) | All F-01–F-05 |

Shared artifacts: [route/envelope/security conventions](shared-conventions.md), [fixtures and test parameters](fixtures.md), [Product DoD](product-dod.md), and [AC↔TEST / requirements / existing Issue AC matrix](verification-matrix.md). Shared fields/routes/error codes are authoritative across these draft contracts; change them together rather than producing incompatible feature interpretations.

## 3. Confirmed, Proposed and Open

Confirmed baseline rules remain in the SRS; new methods/paths/payload names, schema details, test parameters and UI behavior are **Proposed** until this contract revision is reviewed/accepted. An API design proposal does not establish that the stack/auth mechanism was selected. The PR #17 Borrower-only creation agreement is recorded as team scope agreement, not a newly invented SRS prohibition on staff borrowing.

| Decision gate | Required recorded decision | Affected work / status |
|---|---|---|
| SDS-OQ-01 | Stack selected in SDS rev 3 / PR #22; physical request schema implemented by #11 | Resolved stack choice; each feature still verifies its own runtime/query behavior |
| SDS-OQ-02 | Server session + HttpOnly cookie + trusted-origin validation, idle60/absolute480 minutes (SDS rev 3 / PR #22) | Resolved; F-04 reuses the established guards |
| SRS OQ-01 | Approved initial synthetic demo catalog content | F-02 seed; symbolic test catalog is a proposal, not a resolution; **Open** |
| SRS OQ-02 | Choice recorded in A-12, explicit user decision 2026-11-06; team ratification pending PR #36: multi-unit up to current stock; no extra per-user cap; full return per loan | F-04 request and F-05 full checkout implemented; F-06 return remains Sprint 2 |
| SDS-OQ-03 | User explicitly confirmed Asia/Bangkok, UTC checkout instant and local calendar date +7 during #12 implementation (2026-11-07) | F-05 date-boundary tests executed; shared-baseline peer review pending |
| Contract proposal review | Accept/revise route inventory, schema/validation/error choices and test parameters with affected IDs | All six contracts; **Pending independent team review** |

At the original Part E revision these gates were open. Later PR #22/SDS rev 3 selected stack/auth, and the explicit Issue #11 user decision (2026-11-06) recorded the quantity choice as A-12; shared-team ratification evidence remains pending PR #36. Quantity1 examples remain test vectors; current policy permits multi-unit requests bounded by live stock, without reserving units. S2/S3 policies and hosting selection remain at their existing targets; no extra implementation is authorized to close them here.

## 4. Spec-First Versioning and Verification Handoff

1. Review the complete source revision, resolve the above gates, and record decisions with actual human approval references. Update upstream SDS/SRS only where a decision actually changes their baseline; do not silently rewrite requirements to fit code.
2. Commit the accepted contract/test-design revision **before** related implementation; record its real SHA in the implementation Issue/PR. This task's local revision history is not a substitute for a real prior spec commit.
3. For meaningful domain/security rules, write the planned behavior test and capture authentic RED output, implement/correct it, capture GREEN and preserve regression coverage. Record actual files/commands/SHAs.
4. Execute the planned STS on real software with the selected tools/DB; populate actual result evidence through F-10. Current tests remain PLANNED / NOT RUN, and document coverage is not test execution.
5. If a design changes, add a revision entry with reason, affected requirement/AC/TEST IDs, approval reference and verification impact. Retire superseded IDs without reuse. Follow the [Product DoD](product-dod.md) for feature review, staging integration, release and evidence.

## 5. Issue #5 Acceptance Review

| Criterion | Draft evidence | Current status |
|---|---|---|
| AC-E-01 | Six contracts with feature SDS, applicable UI/API/data, AC, STS and DoD | Content drafted; final contract baseline **pending decision gates and peer review** |
| AC-E-02 | Stable AC-Fxx-nn definitions with explicit positive/negative/boundary/access outcomes | Drafted; policy-dependent outcomes explicitly gated |
| AC-E-03 | Per-contract STS and [central mapping](verification-matrix.md), including levels/input/actions/expected results | Planned coverage; no runtime result claimed |
| AC-E-04 | Upstream requirement/feature/sprint and existing Issue AC alignment | Baseline preserved; unresolved choices not silently decided |
| AC-E-05 | Revision tables, spec-first change procedure and [Product DoD](product-dod.md) | Draft procedure/checklist; actual accepted spec SHA and execution evidence are future work |

Issue #5 is not claimed Done: acceptance of the contracts, dependent team decisions and independent teammate review remain necessary. Issue #6 implementation and its release/test evidence are separate work.

## 6. Revision History

| Rev | Change | Basis |
|---|---|---|
| 1 — 2026-11-05 | Initial Part E source set with six contracts, shared conventions/fixtures, DoD and planned mappings | Source baseline c78ad95; Issue #5/#6/#8–#13; original PDFs and PR #15/#16/#17/#19/#20 |
| 2 — 2026-11-06 | Reconciled current stack/auth and A-12 quantity resolutions; feature execution remains separately recorded with F-05-dependent cases partial | SDS rev 3/4; user decision in Issue #11 work session |
