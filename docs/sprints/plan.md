# Three-Sprint Plan (Part D)

> **Project:** PEW-DIY — D.I.Y. Room Equipment Borrowing System
> **Deliverable:** D1-04 Part D — Three-Sprint Plan | **Issue:** [#4](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/4)
> **Status:** Draft for team review | **Language:** English (SRS A-07)
> **Baseline:** [SRS](../srs.md) rev 2 · [Feature Inventory](../features.md) rev 1 · [Traceability](../traceability.md) rev 1 · [System SDS](../system-sds.md) rev 2
> **Reference:** `project_deliverable_1_v1.pdf` §3.4 · `group_work_specs_v1.pdf` §4, §7
> Status vocabulary: **Confirmed** (baseline/course backed) · **Proposed** (awaiting team confirmation) · **Open** (decision still required)

---

## 1. Timeline and Checkpoints

| Checkpoint | Date | Required outcome | Source |
|---|---|---|---|
| Sprint 1 → **Deliverable 1** | **8 Nov 2026, 23:59** | Engineering baseline (Parts A–E) + working Sprint 1 on `main` with release tag | `project_deliverable_1_v1.pdf` header/§4 |
| Sprint 2 → **Deliverable 2** | **29 Nov 2026** | Sprint 2 complete + Sprint 3 contracts and working progress; integrated release candidate | `group_work_specs_v1.pdf` §9 |
| Sprint 3 → **Final Delivery** | **13 Dec 2026** | Complete verified release, final report, demo video | `group_work_specs_v1.pdf` §9 |
| Group labs (cross-cutting) | Lab 5: sessions 3 & 5 Nov, **due 15 Nov**; Lab 6: sessions 10 & 12 Nov, due 22 Nov; Lab 7: sessions 17 & 19 Nov, due 29 Nov | Docker/CI/GCP on the Sprint 1 release; cross-team UAT; maintenance change + metrics | `group_work_specs_v1.pdf` §4/§10 |

> **Verified schedule (§4 table rows match §9/§10 headers exactly):** Deliverable 1 = **8 Nov** · Lab 5 = **15 Nov** · Lab 6 = **22 Nov** · Lab 7 = **29 Nov** · Deliverable 2 = 29 Nov · Final = 13 Dec.
> **Note (rev 3):** rev 2 claimed a Lab 5/D1 date conflict — that claim was **withdrawn as incorrect** (caused by a text-extraction row misalignment, not a real document conflict). If the instructor issues a formal schedule change, reference that announcement directly.
> **Open — demo video length conflict (real, verified in both PDFs):** master spec §9 and `project_final_delivery_v1.pdf` §2 say "Maximum 10 minutes", but `project_final_delivery_v1.pdf` §3.5 says "Maximum 4 minutes" — see §10 Open Questions.

## 2. Sprint Overview

| Sprint | Goal | Features | Completion outcome |
|---|---|---|---|
| **1** (→ 8 Nov) | Small deployable product: authentication/authorization foundation + one complete domain slice (request → checkout → active loan) with tested business rules and persistence | F-01, F-02, F-03, F-04, F-05, F-10 | Working increment released on `main` with tag; Parts A–F evidence for Deliverable 1 |
| **2** (→ 29 Nov) | Core expansion under feature engineering contracts: return, overdue, catalog management, search, loan views/history | F-06, F-07, F-08 | All Sprint 2 features complete and integrated; Sprint 3 contracts drafted with working progress; deployed release candidate |
| **3** (→ 13 Dec) | Completion and hardening: inventory reporting, failure handling, usability, regression, defect correction | F-09 + hardening work | Complete verified release; final QA/traceability; demo video and release summary |

Collectively the three sprints cover the entire product baseline (`docs/traceability.md`: 41/41 requirements mapped — see §7).

## 3. Sprint 1 — Small Deployable Product (Deliverable 1, 8 Nov)

**Goal (Confirmed — `group_work_specs_v1.pdf` §7):** a small, useful, tested vertical slice with real login/logout, two roles, server-side authorization, persistent database, one meaningful domain transaction, and a tested business-rule rejection.

**Feature IDs:** F-01, F-02, F-03, F-04, F-05, F-10

| Feature | Sprint 1 scope |
|---|---|
| F-01 Authentication & RBAC | Login/logout/current-user; Borrower + Custodian roles enforced server-side; ownership checks; salted-hash credentials (BR-10) |
| F-02 Equipment Catalog (seed + read) | Seeded synthetic catalog (FR-08); list/detail views (FR-06) |
| F-03 Equipment Availability | Derived Available Quantity display (FR-07, BR-03 invariant) |
| F-04 Borrowing Request | Borrower submits request for available item (FR-11, BR-01); views own requests (FR-12); custodian views submitted requests (FR-13) |
| F-05 Checkout and Active Loan | Custodian checkout → persistent Active Loan + availability update, atomic (FR-14/15/16-active); due date = checkout + 7 days (BR-07); reject unavailable checkout (BR-02) and duplicate active loan (BR-03) |
| F-10 Integration & Verification | End-to-end journey, test automation (NFR-09), reproducible setup (NFR-08), restart persistence (NFR-04-S1) |

**Domain journey (Confirmed — Theme 2 Sprint 1 example):** seeded catalog → Borrower login → request available item → view own request → Custodian login → record checkout → Active Loan created + availability updated; system rejects checkout of unavailable items and duplicate active loans for a single-unit item.

**Dependencies:** F-01 → F-02 → F-03 → F-04 → F-05 → F-10 (per `docs/features.md`). Engineering contracts ([D1-05]) precede implementation of each feature. Decision gates **before implementation**: SDS-OQ-01 (stack), SDS-OQ-02 (session/token), SRS OQ-01 (seed catalog), SRS OQ-02 (quantity contract).

**Expected outcomes:** working increment on `main` + release tag; README setup instructions; Part F evidence (domain journey + persisted retrieval, rule rejection, access restriction, AC→test results).

**Verification activities (aligned with [D1-05] AC/STS):** valid/invalid login and logout; unauthenticated and forbidden-role API tests; cross-borrower access tests; BR-01/02/03 negative tests; concurrency test for single-unit items (NFR-05); checkout atomicity test (NFR-06-S1); restart read-back (NFR-04); UI/E2E journey; TDD evidence for one meaningful rule.

**Feasibility (AC-D-03):** 6 features bounded by the theme's example depth (no approval subsystem under Direct Checkout, no Return/search/reporting); 4 entities; seeded accounts; UI limited to auth, catalog, request, checkout, my-requests/loans. **Risk:** the 8 Nov checkpoint leaves little buffer after Parts A–C — Sprint 1 implementation starts immediately after [D1-05] contracts.

## 4. Sprint 2 — Core Expansion (Deliverable 2, 29 Nov)

**Goal (Confirmed — §7):** implement the major remaining product workflows under feature engineering contracts, integrated and tested.

**Feature IDs:** F-06, F-07, F-08

| Feature | Requirements |
|---|---|
| F-06 Return | FR-17, BR-09 (close-accounting guard), NFR-04-S2, NFR-06-S2 |
| F-07 Overdue Status | FR-19, BR-08 (derived: now > due date, no return) |
| F-08 Catalog Management, Search, Loan Views | FR-09 (custodian item CRUD/quantities), FR-10 (search/filter), FR-18 (custodian all-loans), FR-21 (borrower full history) |

**Dependencies:** F-06 and F-07 depend on F-05 (loan lifecycle, due dates); F-08 depends on F-02 and F-05. F-06 must resolve SRS OQ-02 return semantics (full vs partial) before its contract is baselined.

**Expected outcomes:** all Sprint 2 features complete and integrated (mandatory per Deliverable 2); Sprint 3 contracts drafted with working progress; integrated release candidate with CI/deployment (Lab 5 pipeline) tied to a commit.

**Verification activities:** return/close-accounting tests (BR-09); return atomicity (NFR-06-S2); overdue boundary tests (due date equality is not overdue); catalog-write authorization (BR-06); search; borrower-history isolation (BR-05); full regression of Sprint 1 behavior.

**Cross-cutting labs in this window (Confirmed):** Lab 5 containerizes the Sprint 1 release (**due 15 Nov**; redeployment read-back for NFR-04 completes here); Lab 6 cross-team UAT (**due 22 Nov**); Lab 7 one approved maintenance change + metrics (**due 29 Nov**) — evidence feeds Deliverable 2 and Final Delivery.

## 5. Sprint 3 — Completion and Hardening (Final Delivery, 13 Dec)

**Goal (Confirmed — §7):** complete remaining planned features, integration, failure handling, usability, authorization, regression tests, and defect correction; release the complete product.

**Feature IDs:** F-09 + hardening

| Work | Requirements |
|---|---|
| F-09 Inventory Reporting | FR-20 (inventory/loan/overdue summaries), NFR-07 (performance baseline, verify here) |
| Hardening | Failure handling, UI polish, authorization regression, defect correction from UAT (Lab 6 findings) |

**Dependencies:** F-09 depends on F-06/F-07/F-08 data. Sprint 3 **contracts are drafted during Sprint 2** (Deliverable 2 requires them plus working progress).

**Expected outcomes:** complete verified release (`main` + tag, deployed URL retained for grading); final requirements/test traceability with actual results; final QA/Product DoD evidence; demo video (**length conflict — see §10 OQ; plan ≤ 4 min until clarified**, both students) showing one business rule, one failure/access case, one requirement→test chain; one-page release summary.

**Verification activities:** full regression suite; NFR-07 timing check; UAT re-tests of corrected defects; traceability completeness (baseline coverage, requirement → AC/verification → final result); release readiness checklist.

## 6. Dependency and Sequencing Map

```
Documents:  [D1-01] SRS → [D1-02] Part B → [D1-03] SDS → [D1-04] plan → [D1-05] contracts → [D1-06] implementation
Sprint 1:   F-01 → F-02 → F-03 → F-04 → F-05 → F-10 (integration) → release
Sprint 2:   F-05 ─┬→ F-06 (Return) → F-07 (Overdue) ─┐
            F-02 ─┴→ F-08 (Catalog mgmt/search/views) ┴→ integration → RC
Sprint 3:   F-06/F-07/F-08 data → F-09 (Reporting) + hardening → final release
Decision gates before implementation: SDS-OQ-01 (stack), SDS-OQ-02 (auth), SDS-OQ-03 (calendar/timezone policy — tied to F-05 checkout contract/tests per SDS §10), OQ-01 (seed catalog), OQ-02 (quantity/return semantics)
```

Rule: every feature is implemented on a branch from `sprint/1-staging` under its engineering contract, peer-reviewed, and integrated before release (AGENTS/AGENT.md §11.3).

## 7. Baseline Coverage Check (AC-D-02)

| Sprint | Features | Requirement set covered |
|---|---|---|
| 1 | F-01–F-05, F-10 | FR-01–FR-08, FR-11–FR-16(active), BR-01–BR-07, BR-10, BR-11(S1), NFR-01–NFR-06(S1), NFR-08, NFR-09 |
| 2 | F-06–F-08 | FR-09, FR-10, FR-17, FR-18, **FR-19**, FR-21, BR-06(writes), BR-08, BR-09, BR-11(S2), NFR-04(S2), NFR-06(S2) |
| 3 | F-09 + hardening | FR-20, NFR-07 + regression/defect scope |

Uncovered requirements: **none** (`docs/traceability.md` §5: 21 FR + 11 BR + 9 NFR all mapped). Return/Overdue/Reporting are allocated across Sprint 2–3 per AC-D-02.

## 8. Team Work Organization (Proposed — pending team confirmation)

**Confirmed constraints (`group_work_specs_v1.pdf` §2):** two students; both must participate in requirements/design, testing, AI-agent supervision, implementation, review, deployment, and maintenance; **no permanent role division** (e.g., "one writes specs, the other writes code" is prohibited); contributions recorded via Issues, commits, PRs, and a short contribution table; both must be able to explain any sampled requirement, test, design decision, or release step.

**Proposed working model (Proposed — team confirms; no assumptions made about individual availability or skills):**

| Practice | Proposal |
|---|---|
| Feature work | Every Sprint 1 feature has one **author** and the other student as **reviewer**; authorship alternates across features so both gain full-stack experience |
| Tests | Both write tests; each student authors tests for at least one domain rule and one access rule |
| AI agents | Each student supervises their own agent's output and reviews the other's AI-assisted PRs; AI-use declarations kept jointly |
| PR review | Authors never approve their own PRs; reviews must contain a specific check/question/finding |
| Releases | Both participate in integration and the release PR; demo video and contribution table include both |
| Time/capacity | **Open** — specific day-by-day allocation is set by the team from actual availability; this plan does not assume member capacity |

## 9. Reconciliation Notes

| Topic | Resolution | Basis |
|---|---|---|
| Theme 2 "later sprints" lists *inventory summaries* alongside Return/Overdue/search | Full inventory reporting (FR-20, F-09) is allocated to **Sprint 3**; Sprint 2 includes loan views/history (FR-18/FR-21) which cover operational "who holds what" summaries. AC-D-02 explicitly allows the Return/Overdue/Reporting span of **Sprint 2–3**. Moving summaries to Sprint 2 would require a baseline change (FR-20/F-09 re-allocation) — flag to team if desired | `docs/srs.md` FR-20, `docs/features.md` F-09, issue #4 AC-D-02 |
| Due-date assignment (BR-07) | In **Sprint 1** (F-05); only overdue computation (BR-08) is Sprint 2 | SRS rev 2 split, PR #15 review |
| Approval workflow | None in any sprint (Direct Checkout, A-02) | Team decision |

## 10. Open Questions and Risks

| Item | Impact | Target |
|---|---|---|
| SDS-OQ-01 (stack), SDS-OQ-02 (session/token) | Block Sprint 1 implementation and AC-C-01/04 closure | Immediately — before [D1-05] baseline |
| SDS-OQ-03 (calendar/timezone policy) | F-05 checkout contract and BR-07/08 date-boundary tests | Before [D1-05] checkout contract |
| **Demo video length conflict** — master spec §9 + `project_final_delivery_v1.pdf` §2 say ≤ 10 min; `project_final_delivery_v1.pdf` §3.5 says ≤ 4 min | Final Delivery rubric compliance | Confirm with instructor/TA; **plan ≤ 4 min meanwhile** (stricter limit satisfies both readings) — recorded per PR #20 review |
| SRS OQ-01 (actual catalog) | Seed fixtures | Before Sprint 1 seed |
| SRS OQ-02 (multi-unit loans + partial return) | F-04/F-05 quantity contract and F-06 return semantics | Before [D1-05] baseline |
| Deliverable 1 date (8 vs possible 15 Nov) | Sprint 1 buffer | **Resolved — 8 Nov confirmed** by §4 table row and §9 (removed as OQ per PR #20 review rev 3) |
| Team capacity split (§8) | Task assignment | Team confirmation |

## 11. Lab 5 Readiness and Deliverable Separation

> Source: `01_SE_Lab_5_updated.pdf` (Lab 5 handout) §4.1, §4.3, §8, §11, §12. Status levels: **Completed** · **In Progress / Planned** · **External Dependency**. Owners/targets are **Pending Team Assignment** (no team agreement recorded yet — do not assume). This section tracks lab requirements only; it does **not** change Sprint allocation (see §11.4).

### 11.1 Lab 5 Requirements (R-01 – R-12) status map

| ID | Requirement (summary) | Status | Owner / target | How verified |
|---|---|---|---|---|
| R-01 | Docker packaging; fresh build from clean clone produces a working container | In Progress / Planned | Pending Team Assignment | C-03 |
| R-02 | Read every setting from environment; document each variable (`.env.example` or `deployment.md`); no real secret committed | In Progress / Planned (`.env.example` + fail-closed config exist since PR #22; must stay current as the app grows) | Pending Team Assignment | C-03 + repository inspection |
| R-03 | Deploy on GCP at a public URL; domain workflow works through UI, API, database | External Dependency (GCP Free Trial access per handout §4.4) / Planned (deploy work) | Pending Team Assignment | C-04 |
| R-04 | Persistent database; data survives restart **and** redeploy; nothing needed is kept only in the container | In Progress / Planned (restart verified NFR-04/TEST-F01-16; redeploy read-back requires Lab 5 deployment) | Pending Team Assignment | C-05 |
| R-05 | Build + automated tests run on every relevant PR with meaningful results | Planned | Pending Team Assignment | C-01 |
| R-06 | Passing check is required; failed check blocks the release path (failing PR demo from a temporary branch) | Planned | Pending Team Assignment | C-02 |
| R-07 | Accepted releases deploy from main through a repeatable pipeline (reviewed change → CI → merge → deployment) | Planned (staging→main release-PR convention already in use) | Pending Team Assignment | C-06 |
| R-08 | Identify the commit of each release (tag or SHA); document the release procedure | Planned (tag convention in use) | Pending Team Assignment | C-06 |
| R-09 | Issues/project board/feature branches/PRs into staging reviewed by teammate; release PR staging→main; authors do not approve own PRs; reviews state a specific check | **Completed** (workflow in use since [D1-07]) | Both members (ongoing) | PR history evidence |
| R-10 | Label Lab 5 Issues and PRs (e.g. `lab5`) so evidence is separate from unrelated feature work | In Progress / Planned (label `lab5` created with this change) | Pending Team Assignment | Label existence + usage on Lab 5 Issues/PRs |
| R-11 | Both members take part in requirements, testing, AI-agent supervision, implementation, review, deployment; record contributions | In Progress / Planned (team practice per §8) | Both members | Contribution records (Issues/PRs) |
| R-12 | Repository public until grading ends | **Completed** (repository is public) | Both members | Repository visibility |

### 11.2 Lab 5 Required Files checklist

| File | Status | Note |
|---|---|---|
| `Dockerfile`, `.dockerignore` | Planned | Lab 5 execution work (not Sprint 1 doc work) |
| `.env.example` | In Progress | Exists since PR #22 — must document **every** env var the app reads |
| CI + deploy workflows (e.g. `.github/workflows/ci-docker.yml`, `deploy.yml`) | Planned | Lab 5 execution work |
| `docs/labs/lab-05/deployment.md` | Planned | Stack + env var table + build/test/run/migrate/seed commands + GCP names + release procedure incl. how to find the running commit |

### 11.3 Required Checks (C-01 – C-06) — verification method

| Check | What it shows | Evidence / how verified |
|---|---|---|
| C-01 | Normal PR runs build + all automated tests, passing | CI run link + test summary |
| C-02 | A PR from a temporary branch with one failing test cannot be merged | PR link; failed check + blocked-merge evidence |
| C-03 | Fresh clone builds and runs with only `.env.example` values filled in | Commands + output |
| C-04 | Domain workflow works on the public URL: sign in, main business action, one rule rejection or access restriction | Screenshots with the URL visible |
| C-05 | A record created before restart and redeploy still exists afterwards | Before/after screenshots |
| C-06 | A reviewed change goes staging→main and deploys; running revision matches its commit | PR links, pipeline run, GCP revision |

### 11.4 Lab 5 vs Deliverable 2 — scope separation

| Dimension | Lab 5 (lab track) | Deliverable 2 (project track) |
|---|---|---|
| Due | 15 Nov 2026, 23:59 | 29 Nov 2026, 23:59 |
| Points | 100 lab points (5%) | 70 project points (7%) |
| Purpose | Containerize the accepted Sprint 1 release + CI/CD + GCP deployment | Sprint 2 completion + Sprint 3 contracts/progress + deployed integrated release candidate |
| Submission | `lab5_sec<section>_<group name>.pdf` | Deliverable 2 PDF via LEB2 |
| Requirements | R-01..R-12 + C-01..C-06 (this section) | Deliverable 2 Parts A–E |

**Rule:** Lab 5 requirements are **not** Sprint 2/3 features — they add no `F-xx` and do not change Sprint allocation (the allocation in §2–§5 stands unchanged). The dependency direction is one-way: Deliverable 2 §3.5 requires the candidate to deploy **through the delivery process established in Lab 5** — i.e. Deliverable 2 *uses* Lab 5 infrastructure; it does not absorb Lab 5 requirements.

**UI readiness note (C-04 dependency):** C-04 requires a working UI domain journey (sign in → main business action → one rejection/restriction) on the deployed URL by **15 Nov**. The F-01 implementation is currently backend-only; the remaining F-01 scope (AC-F01-11 UI, TEST-F01-13 browser/E2E — tracked in Issue #8) and the F-02..F-05 UI work must therefore land **within Sprint 1**. This is a readiness note for Lab 5 — it does not change Sprint allocation.

## 12. Revision History

| Rev | Change | Basis |
|---|---|---|
| 1 — 2026-11-04 | Initial three-sprint plan | SRS rev 2, Part B rev 1, Part C rev 2, `project_deliverable_1_v1.pdf` §3.4, `group_work_specs_v1.pdf` §4/§7/§9 |
| 2 — 2026-11-04 | PR #20 peer review round 1: recorded demo video length conflict (10 min vs 4 min) as OQ with ≤ 4 min interim plan; added FR-19 to §7 coverage summary; added SDS-OQ-03 to decision gates | PR #20 review by L0u1sss; `project_final_delivery_v1.pdf` §2/§3.5; SDS §10 |
| 3 — 2026-11-04 | PR #20 peer review round 2: **corrected lab/deliverable schedule** to Lab 5 = 15 Nov, Lab 6 = 22 Nov, Lab 7 = 29 Nov, D1 = 8 Nov (verified by extracting the §4 table with row structure — table rows match §9/§10 headers); **withdrew the rev-2 "schedule conflict" claim as incorrect** (text-extraction row misalignment, not a document conflict); removed the D1-date OQ (resolved); added due dates to Sprint 2 lab references | PR #20 review round 2 by L0u1sss; `group_work_specs_v1.pdf` §4 table (extracted with cell coordinates), §9, §10 |
| 4 — 2026-11-05 | Added §11 Lab 5 Readiness: R-01..R-12 status map (Completed / In Progress-Planned / External Dependency, owners Pending Team Assignment), Required Files checklist, C-01..C-06 verification methods, Lab 5 ↔ Deliverable 2 scope separation, and the C-04 UI readiness note; **no Sprint allocation change** | FIX-B #24; `01_SE_Lab_5_updated.pdf` §4.1/§4.3/§8/§11/§12 |
