# Requirements Traceability Matrix (Part D)

> **Project:** PEW-DIY — D.I.Y. Room Equipment Borrowing System
> **Deliverable:** D1-02 Part B / Deliverable 2 Part D — Updated Requirements & Test Traceability | **Issue:** [D1-02]
> **Status:** Deliverable 2 Baseline (rev 4 — 2026-11-28) | **Language:** English (team decision A-07)
> **Sources of truth:** `docs/srs.md` (rev 8) · `docs/features.md` (rev 3, companion)
> **Reference:** `project_deliverable_2_v1.pdf` §3.4 — `Requirement → Feature/Responsibility → Sprint → AC or NFR Verification → Planned Test → Actual File/Test or Measurement → Result & Version`

---

## 1. How to Read This Matrix

- **Assessed Release Version:** `main` commit `5f82a8e0bdd52fa85b3e488c96bdafbdc9a6f3cc` (`PR #119`, deployed Cloud Run `pewdiy-00010-fd6`; Sprint 1 continuity anchor: `d079bc6` / `b03c904`).
- **Verification Discipline (§3.4):** Every implemented AC maps to an actual executed test file and result on `5f82a8e`. Unimplemented or unexecuted Sprint 3 items (`AC-F09-04`, `AC-F09-05` / `NFR-07`) and external gates (Lab 6 Part B `#82`) are marked explicitly as **`PLANNED — NOT EXECUTED`** or **`BLOCKED`** — never `"Done"`.

---

## 2. Functional Requirements (FR-01 – FR-21)

| Requirement | Feature / Responsibility | Sprint | AC / NFR Verification | Planned Test | Actual File / Test or Measurement | Result & Version |
|---|---|---|---|---|---|---|
| FR-01 Login + session/token issue | F-01 | Sprint 1 | `AC-F01-01..03` | `TEST-F01-01..03` | `server/tests/auth-routes.test.ts`, `client/src/test/login-page.test.tsx`, `e2e/specs/auth-journey.spec.ts` | **Passed** (`5f82a8e` / `d079bc6`) |
| FR-02 Logout invalidates session/token | F-01 | Sprint 1 | `AC-F01-04..06` | `TEST-F01-04..06` | `server/tests/auth-routes.test.ts`, `server/tests/sprint1-integration.test.ts`, `e2e/specs/auth-journey.spec.ts` | **Passed** (`5f82a8e` / `d079bc6`) |
| FR-03 Current-user identity retrieval | F-01 | Sprint 1 | `AC-F01-07..08` | `TEST-F01-07..08` | `server/tests/auth-routes.test.ts`, `client/src/test/account-menu.test.tsx` | **Passed** (`5f82a8e` / `d079bc6`) |
| FR-04 Two roles enforced server-side | F-01 | Sprint 1 | `AC-F01-09..11` | `TEST-F01-09..11` | `server/tests/authz.test.ts`, `server/tests/sprint1-integration.test.ts`, `server/tests/sprint2-integration.test.ts` | **Passed** (`5f82a8e`) |
| FR-05 Borrower sees only own requests/loans | F-01 | Sprint 1 | `AC-F01-12` | `TEST-F01-12` | `server/tests/authz.test.ts`, `server/tests/sprint1-integration.test.ts`, `server/tests/sprint2-integration.test.ts` | **Passed** (`5f82a8e`) |
| FR-06 Equipment catalog (name, desc, category, qty, S2 image/status/bounds) | F-02 (S1) / F-08 (S2) | Sprint 1 / 2 | `AC-F02-01..03`, `AC-F08-01..02` | `TEST-F02-01..03`, `TEST-F08-01..02` | `server/tests/catalog.test.ts`, `client/src/test/catalog-page.test.tsx`, `client/src/test/item-detail-page.test.tsx` | **Passed** (`5f82a8e`, `#115` bounds) |
| FR-07 Compute and display Available Quantity | F-03 | Sprint 1 | `AC-F03-01..04` | `TEST-F03-01..04` | `server/tests/availability.test.ts`, `e2e/specs/catalog-journey.spec.ts` | **Passed** (`5f82a8e` / `d079bc6`) |
| FR-08 Seeded demo catalog, reproducible, synthetic | F-02 | Sprint 1 | `AC-F02-04` | `TEST-F02-04` | `server/tests/seed-safety.test.ts`, `server/tests/sprint1-integration.test.ts` | **Passed** (`5f82a8e` / `d079bc6`) |
| FR-09 Custodian creates/updates/retires items, adjusts qty | F-08 | Sprint 2 | `AC-F08-01..03` | `TEST-F08-01..03` | `server/tests/catalog.test.ts`, `server/tests/sprint2-integration.test.ts`, `e2e/specs/sprint2-journey.spec.ts` | **Passed** (`5f82a8e`) |
| FR-10 Search/filter/sort catalog | F-08 | Sprint 2 | `AC-F08-04`, `AC-F08-06` | `TEST-F08-04`, `TEST-F08-06` | `server/tests/catalog.test.ts`, `server/tests/sprint2-integration.test.ts`, `client/src/test/catalog-page.test.tsx` | **Passed** (`5f82a8e`) |
| FR-11 Borrower submits request (single/bundle, purpose, 1–14d) & cancels | F-04 / `A-11` | Sprint 1 / 2 | `AC-F04-01..08`, `AC-F11-01..03` | `TEST-F04-*`, `TEST-F11-01..03` | `server/tests/borrowing-request.test.ts`, `server/tests/sprint2-integration.test.ts`, `client/src/test/borrowing-request.test.tsx` | **Passed** (`5f82a8e`) |
| FR-12 Borrower views own requests with status (incl. `EXPIRED`) | F-04 / `A-11` | Sprint 1 / 2 | `AC-F04-06..07`, `AC-F11-02` | `TEST-F04-06`, `TEST-F11-02` | `server/tests/sprint2-integration.test.ts`, `e2e/specs/sprint2-journey.spec.ts` | **Passed** (`5f82a8e`, `#113` expiry) |
| FR-13 Custodian views & approves/rejects pending requests | F-04 / `A-11` | Sprint 1 / 2 | `AC-F11-02..03` | `TEST-F11-02..03` | `server/tests/sprint2-integration.test.ts`, `e2e/specs/sprint2-journey.spec.ts` | **Passed** (`5f82a8e`) |
| FR-14 Custodian checkout (approved request/bundle) → Active Loan + availability | F-05 / `A-11` | Sprint 1 / 2 | `AC-F05-01..06`, `AC-F11-04` | `TEST-F05-*`, `TEST-F11-04` | `server/tests/loan.test.ts`, `server/tests/sprint2-integration.test.ts`, `e2e/specs/checkout.spec.ts` | **Passed** (`5f82a8e`) |
| FR-15 Active Loan records + printable loan slip | F-05 / `A-11` | Sprint 1 / 2 | `AC-F05-07`, `AC-F11-05` | `TEST-F05-07`, `TEST-F11-05` | `client/src/test/loan.test.tsx`, `e2e/specs/sprint2-journey.spec.ts` | **Passed** (`5f82a8e`) |
| FR-16 Borrower views own active loans / full history | F-05 / F-08 | Sprint 1 / 2 | `AC-F05-08`, `AC-F08-05` | `TEST-F05-08`, `TEST-F08-05` | `server/tests/sprint2-integration.test.ts`, `client/src/test/loan.test.tsx` | **Passed** (`5f82a8e`) |
| FR-17 Borrower requests return; Custodian confirms return → restore stock | F-06 | Sprint 2 | `AC-F06-01..06` | `TEST-F06-01..06` | `server/tests/sprint2-integration.test.ts`, `client/src/test/loan.test.tsx`, `e2e/specs/sprint2-journey.spec.ts` | **Passed** (`5f82a8e`) |
| FR-18 Custodian views all room loans (active, return-pending, overdue, history) | F-08 | Sprint 2 | `AC-F08-05..06` | `TEST-F08-05..06` | `server/tests/sprint2-integration.test.ts`, `client/src/test/loan.test.tsx`, `e2e/specs/sprint2-journey.spec.ts` | **Passed** (`5f82a8e`) |
| FR-19 Overdue computation, overdue list, & dismissible/clearable alerts | F-07 | Sprint 2 | `AC-F07-01..05` | `TEST-F07-01..05` | `server/tests/sprint2-rules.test.ts`, `server/tests/sprint2-integration.test.ts`, `client/src/test/notifications-reports.test.tsx` | **Passed** (`5f82a8e`) |
| FR-20 Inventory reports/summaries (`Summary` + `/reports` + `expired_count` vs CSV export) | F-09 | Sprint 3 | `AC-F09-01..03` (done); `AC-F09-04` (gap) | `TEST-F09-01..03`; `TEST-F09-04` | `server/tests/sprint2-integration.test.ts`, `client/src/test/notifications-reports.test.tsx`, `e2e/specs/sprint2-journey.spec.ts` | **Partial (`5f82a8e`)**: `AC-F09-01..03` **Passed**; `AC-F09-04` **PLANNED — NOT IMPLEMENTED** |
| FR-21 Borrower borrow/return history | F-08 | Sprint 2 | `AC-F08-05` | `TEST-F08-05` | `server/tests/sprint2-integration.test.ts`, `client/src/test/loan.test.tsx` | **Passed** (`5f82a8e`) |

---

## 3. Business Rules (BR-01 – BR-13)

| Requirement | Feature / Responsibility | Sprint | AC / NFR Verification | Planned Test | Actual File / Test or Measurement | Result & Version |
|---|---|---|---|---|---|---|
| BR-01 Request only when `ACTIVE` & Available Qty ≥ 1 | F-04, F-03 | Sprint 1 / 2 | `AC-F04-02..03`, `AC-F08-02` | `TEST-F04-02`, `TEST-F08-02` | `server/tests/borrowing-request-unit.test.ts`, `server/tests/sprint2-integration.test.ts` | **Passed** (`5f82a8e`) |
| BR-02 Checkout of unavailable or unapproved item/request rejected | F-05, F-03 | Sprint 1 / 2 | `AC-F05-02`, `AC-F11-04` | `TEST-F05-02`, `TEST-F11-04` | `server/tests/loan.test.ts`, `server/tests/sprint2-integration.test.ts` | **Passed** (`5f82a8e`) |
| BR-03 Available Qty never < 0; single-unit item ≤ 1 active loan | F-05, F-03 | Sprint 1 | `AC-F05-03..04` | `TEST-F05-03..04` | `server/tests/loan-unit.test.ts`, `server/tests/loan.test.ts`, `server/tests/sprint1-integration.test.ts` | **Passed** (`5f82a8e`) |
| BR-04 Only Custodian performs checkout/approve/reject/confirm-return; Borrower notice only on own loan | F-01, F-04..F-06 | Sprint 1 / 2 | `AC-F01-09..11`, `AC-F06-04` | `TEST-F01-09`, `TEST-F06-04` | `server/tests/authz.test.ts`, `server/tests/sprint2-integration.test.ts` | **Passed** (`5f82a8e`) |
| BR-05 Borrower sees only own requests/loans/notifications | F-01, F-04..F-08 | Sprint 1 / 2 | `AC-F01-12`, `AC-F07-05`, `AC-F08-05` | `TEST-F01-12`, `TEST-F07-04`, `TEST-F08-05` | `server/tests/authz.test.ts`, `server/tests/sprint2-integration.test.ts` | **Passed** (`5f82a8e`) |
| BR-06 Only Custodian modifies catalog; reject `new_total < held` | F-01, F-02, F-08 | Sprint 1 / 2 | `AC-F08-02..03` | `TEST-F08-02..03` | `server/tests/catalog.test.ts`, `server/tests/sprint2-integration.test.ts` | **Passed** (`5f82a8e`) |
| BR-07 Due date = checkout + requested duration (`1–14`d, default `7`) in `Asia/Bangkok` | F-05 | Sprint 1 / 2 | `AC-F05-06`, `AC-F11-04` | `TEST-F05-06`, `TEST-S2-RULE-01` | `server/tests/sprint2-rules.test.ts`, `server/tests/loan.test.ts` | **Passed** (`5f82a8e`) |
| BR-08 Loan overdue when `now > due_on` (`Asia/Bangkok`) and no return confirmed | F-07 | Sprint 2 | `AC-F07-01..02` | `TEST-F07-01..02` | `server/tests/sprint2-rules.test.ts`, `server/tests/sprint2-integration.test.ts` | **Passed** (`5f82a8e`) |
| BR-09 Return closes loan, restores availability; full-quantity return; notice does not restore stock | F-06 | Sprint 2 | `AC-F06-01..06` | `TEST-F06-01..06` | `server/tests/sprint2-integration.test.ts` | **Passed** (`5f82a8e`) |
| BR-10 Passwords stored as salted hashes only | F-01 | Sprint 1 | `AC-F01-13` | `TEST-F01-13` | `server/tests/password.test.ts`, `server/tests/seed-safety.test.ts` | **Passed** (`5f82a8e`) |
| BR-11 Persist all state transitions; survive restart or redeployment | F-10, F-04..F-08 | Sprint 1 / 2 / Lab 5 | `AC-F10-03`, `Lab 5 C-05` | `TEST-F10-03` | `server/tests/restart-e2e.test.ts`, `docs/labs/lab-05/deployment.md` (`pewdiy-00010-fd6`) | **Passed** (`5f82a8e`) |
| BR-12 Request (pending/approved) never reserves units or reduces Available Quantity | F-04, F-05, F-03 | Sprint 1 / 2 | `AC-F04-08`, `AC-F11-01..03` | `TEST-F04-08`, `TEST-F11-01` | `server/tests/sprint1-integration.test.ts`, `server/tests/sprint2-integration.test.ts` | **Passed** (`5f82a8e`) |
| BR-13 In-app notifications persist read/clear state without mutating loans/requests | F-07 | Sprint 2 | `AC-F07-03..04` | `TEST-F07-03` | `server/tests/sprint2-integration.test.ts`, `client/src/test/notifications-reports.test.tsx` | **Passed** (`5f82a8e`) |

---

## 4. Non-Functional Requirements (NFR-01 – NFR-09)

| Requirement | Feature / Responsibility | Sprint | AC / NFR Verification | Planned Test | Actual File / Test or Measurement | Result & Version |
|---|---|---|---|---|---|---|
| NFR-01 Auth enforcement (100% protected endpoints; no private data on reject) | F-01 | Sprint 1 | `AC-F01-01..08`, `AC-F10-02` | `TEST-F01-08`, `TEST-F10-02` | `server/tests/auth-routes.test.ts`, `server/tests/sprint1-integration.test.ts`, `deploy/smoke_test.py` | **Passed** (`5f82a8e`) |
| NFR-02 Authorization enforcement (server-side; 0 bypasses) | F-01 | Sprint 1 | `AC-F01-09..12`, `AC-F09-02` | `TEST-F01-09..12`, `TEST-F09-02` | `server/tests/authz.test.ts`, `server/tests/sprint2-integration.test.ts` | **Passed** (`5f82a8e`) |
| NFR-03 Credential protection (0 plaintext) | F-01 | Sprint 1 | `AC-F01-13` | `TEST-F01-13` | `server/tests/password.test.ts`, `server/tests/seed-safety.test.ts` | **Passed** (`5f82a8e`) |
| NFR-04 Persistence & durability (restart or redeployment; 0 data loss) | F-10, F-02..F-06 | Sprint 1 / Lab 5 / 2 | `AC-F10-03`, `Lab 5 C-05` | `TEST-F10-03` | `server/tests/restart-e2e.test.ts`, Cloud Run + Cloud SQL `pewdiy-pg` (`pewdiy-00010-fd6`) | **Passed** (`5f82a8e`) |
| NFR-05 Concurrency safety (0 oversold states) | F-05, F-03 | Sprint 1 | `AC-F05-03..04` | `TEST-F05-03..04` | `server/tests/loan.test.ts`, `server/tests/sprint1-integration.test.ts` | **Passed** (`5f82a8e`) |
| NFR-06 Transaction atomicity (checkout S1 / return S2; 0 partial updates) | F-05, F-06 | Sprint 1 / 2 | `AC-F05-05`, `AC-F06-05` | `TEST-F05-05`, `TEST-F06-05` | `server/tests/loan.test.ts`, `server/tests/sprint2-integration.test.ts` | **Passed** (`5f82a8e`) |
| NFR-07 Performance baseline (catalog/report ≤ 100 items, p95 ≤ 2 s) | F-02, F-09 | Sprint 3 | `AC-F09-05` | `TEST-F09-05` | **Planned formal 100-item timing benchmark** | **PLANNED — NOT EXECUTED** (target 13 Dec) |
| NFR-08 Reproducible setup (≤ 15 min via README) | F-10 | Sprint 1 | `AC-F10-04` | `TEST-F10-04` | `docs/verification/sprint-1/run/setup.json`, `README.md`, `docker-compose.yml` | **Passed** (S1 baseline; Lab 5 C-03 Docker verified in CI `45870992387`) |
| NFR-09 Test automation (non-zero exit on failure) | F-10 | Sprint 1 / 2 | `CI & Docker Build` | `npm run test:ci` | `.github/workflows/ci-docker.yml`, `CI & Docker Build` run `45870992387` (`5f82a8e`) | **Passed** (`5f82a8e`) |

---

## 5. Coverage Summary and Explicit Gaps (Deliverable 2 §3.4)

| Set | Total | Mapped | Implemented & Verified | Uncovered / Remaining Gap |
|---|---:|---:|---:|---|
| FR | 21 | 21 | 20 full + 1 partial (`FR-20`) | `FR-20` `AC-F09-04` (category/date filter + CSV export) is **PLANNED — NOT IMPLEMENTED** (target 13 Dec) |
| BR | 13 | 13 | 13 | None |
| NFR | 9 | 9 | 8 | `NFR-07` / `AC-F09-05` (formal 100-item `p95 <= 2s` benchmark) is **PLANNED — NOT EXECUTED** (target 13 Dec) |
| External / Lab 6 Gate | — | — | Part A interim done; Finding 05 & UAT-07 fixed in S2 | Lab 6 Part B ([Issue #82](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/82)) remains **BLOCKED** (partner handoff missing); Partner retest of Finding 05 pending |

---

*Document history: rev 1–2 created in Deliverable 1. Rev 3 (2026-11-23) aligned Sprint 2/3 rows with SRS rev 6. Rev 4 (2026-11-28, Deliverable 2 Part D): expanded to full 7-column `Requirement → Feature → Sprint → AC/NFR → Planned Test → Actual File/Measurement → Result & Version` matrix against `main` `5f82a8e`, and explicitly disclosed `AC-F09-04`, `AC-F09-05`/`NFR-07`, and Lab 6 Part B `#82` gaps.*
