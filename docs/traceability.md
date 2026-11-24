# Requirements Traceability Matrix (Part B)

> **Project:** PEW-DIY — D.I.Y. Room Equipment Borrowing System
> **Deliverable:** D1-02 Part B — Feature Inventory and Traceability | **Issue:** [D1-02]
> **Status:** Draft for team review | **Language:** English (team decision A-07)
> **Sources of truth:** `docs/srs.md` (rev 6) · `docs/features.md` (rev 2, companion)
> **Reference:** `project_deliverable_1_v1.pdf` §3.2 — matrix form: **Requirement → Feature or responsibility → Sprint and verification**

---

## 1. How to Read This Matrix

- **Requirement** — stable ID from `docs/srs.md`.
- **Feature/responsibility** — `F-xx` from `docs/features.md` (a cross-cutting requirement may map to several features or to the named responsibility F-10).
- **Sprint** — planned allocation from the SRS (Sprint 1 / 2 / 3; Lab 5 where the spec says so).
- **Verification** — Sprint 1 references `AC/TEST — [D1-05]` resolve to the [Part E planned AC↔TEST matrix](sprints/sprint-1/verification-matrix.md), which maps each Sprint 1 requirement and existing Issue AC to its detailed contract/STS. These are draft test designs, not executed results. Actual files/commands/tested-SHA/results are required by Part F/F-10; Sprint 2/3 rows retain sprint allocation per §3.2 and later result traceability.

## 2. Functional Requirements (FR-01 – FR-21)

| Requirement | Feature or responsibility | Sprint and verification |
|---|---|---|
| FR-01 Login + session/token issue | F-01 | Sprint 1; AC/TEST — [D1-05] (valid/invalid login tests) |
| FR-02 Logout invalidates session/token | F-01 | Sprint 1; AC/TEST — [D1-05] (logout lifecycle test) |
| FR-03 Current-user identity retrieval | F-01 | Sprint 1; AC/TEST — [D1-05] |
| FR-04 Two roles enforced server-side | F-01 | Sprint 1; AC/TEST — [D1-05] (forbidden-role API tests) |
| FR-05 Borrower sees only own requests/loans | F-01 | Sprint 1; AC/TEST — [D1-05] (cross-borrower API tests) |
| FR-06 Equipment catalog (name, description, category, total qty, availability, S2 image/status) | F-02 (S1) / F-08 (S2) | Sprint 1 (core) / Sprint 2 (`image_url`, `catalog_status`); Sprint 2 contracts |
| FR-07 Compute and display Available Quantity | F-03 | Sprint 1; AC/TEST — [D1-05] |
| FR-08 Seeded demo catalog, reproducible, synthetic | F-02 | Sprint 1; AC/TEST — [D1-05] (seed reproducibility) |
| FR-09 Custodian creates/updates/retires items, adjusts quantity | F-08 | Sprint 2; Sprint 2 contracts (`f-08-catalog-search-loans.md`) |
| FR-10 Search/filter/sort catalog (name, category, availability, status, sort) | F-08 | Sprint 2; Sprint 2 contracts (`f-08-catalog-search-loans.md`) |
| FR-11 Borrower submits request (single/bundle, purpose, 1–14 days) & cancels own unfulfilled request | F-04 | Sprint 1 (single) / Sprint 2 (bundle, purpose, duration, cancel); Sprint 2 contracts |
| FR-12 Borrower views own requests with status | F-04 | Sprint 1 / Sprint 2 (approval & cancel states); Sprint 2 contracts |
| FR-13 Custodian views & approves/rejects submitted requests | F-04 | Sprint 1 (view) / Sprint 2 (approve/reject); Sprint 2 contracts |
| FR-14 Custodian records checkout (approved request/bundle) → Active Loan + availability, atomic | F-05 | Sprint 1 / Sprint 2 (approval & bundle support); Sprint 2 contracts |
| FR-15 Active Loan records + printable loan slip | F-05 | Sprint 1 / Sprint 2 (print slip); Sprint 2 contracts |
| FR-16 Borrower views own active loans / history | F-05 (active) / F-08 (full history) | Sprint 1 (active): AC/TEST — [D1-05]; Sprint 2 (full history): Sprint 2 contracts |
| FR-17 Borrower requests return; Custodian confirms return → close loan + restore availability, atomic | F-06 | Sprint 2; Sprint 2 contracts (`f-06-return.md`, atomicity per NFR-06 S2) |
| FR-18 Custodian views all room loans (active, return-pending, overdue, history) | F-08 | Sprint 2; Sprint 2 contracts (`f-08-catalog-search-loans.md`) |
| FR-19 Overdue computation, overdue list for custodians, & dismissible/clearable in-app alerts | F-07 | Sprint 2; Sprint 2 contracts (`f-07-overdue-status.md`) |
| FR-20 Inventory reports/summaries | F-09 | Sprint 3 (contracts drafted; summary implementation & tests pending Issues [#99](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/99)/[#100](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/100)); `docs/sprints/sprint-3/f-09-inventory-reporting.md` |
| FR-21 Borrower borrow/return history | F-08 | Sprint 2; Sprint 2 contracts (`f-08-catalog-search-loans.md`) |

## 3. Business Rules (BR-01 – BR-13)

| Requirement | Feature or responsibility | Sprint and verification |
|---|---|---|
| BR-01 Request only when `ACTIVE` & Available Qty ≥ 1 (at request time) | F-04 (enforced), F-03 (data) | Sprint 1 / Sprint 2 (`ACTIVE` check); Sprint 2 contracts |
| BR-02 Checkout of unavailable or unapproved item/request rejected | F-05 (enforced), F-03 (data) | Sprint 1 / Sprint 2 (`APPROVED` gate); Sprint 2 contracts |
| BR-03 Available Qty never < 0; single-unit item ≤ 1 active loan | F-05 (enforced), F-03 (data) | Sprint 1; AC/TEST — [D1-05] (negative: duplicate loan rejected; NFR-05 concurrency) |
| BR-04 Only Custodian performs checkout/approve/reject/confirm-return; Borrower may only submit return notice on own active loan | F-01 (enforcement), F-04, F-05, F-06 | Sprint 1 / Sprint 2; Sprint 2 contracts |
| BR-05 Borrower sees only own requests/loans/notifications | F-01 (enforcement), F-04, F-05, F-07, F-08 | Sprint 1 / Sprint 2; Sprint 2 contracts |
| BR-06 Only Custodian modifies catalog; reject `new_total < held` | F-01 (enforcement), F-02 (S1), F-08 (S2 write) | Sprint 1 / Sprint 2; Sprint 2 contracts |
| BR-07 Due date = checkout + requested duration (1–14 calendar days, default 7) in `Asia/Bangkok` | F-05 | Sprint 1 (7d) / Sprint 2 (1–14d); Sprint 2 contracts |
| BR-08 Loan overdue when `now > due_on` (`Asia/Bangkok`) and no return confirmed | F-07 | Sprint 2; Sprint 2 contracts |
| BR-09 Return closes loan, restores availability; full-quantity return; return notice alone does not restore stock | F-06 | Sprint 2; Sprint 2 contracts (`f-06-return.md`) |
| BR-10 Passwords stored as salted hashes only | F-01 | Sprint 1; AC/TEST — [D1-05] (DB/seed inspection test) |
| BR-11 Persist all state transitions; survive restart **or redeployment** | F-10, F-04, F-05, F-06, F-08 | Sprint 1 / Sprint 2 / Lab 5 & D2 redeployment checks |
| BR-12 Request — submitted, pending, or approved — never reserves units or reduces Available Quantity; only a committed Active Loan does | F-04, F-05, F-03 | Sprint 1 / Sprint 2 (approval & bundles); Sprint 2 contracts |
| BR-13 In-app notifications for approval/rejection/due ≤ 2d/overdue persist read/clear state without mutating loans/requests | F-07 | Sprint 2; Sprint 2 contracts |

## 4. Non-Functional Requirements (NFR-01 – NFR-09)

| Requirement | Feature or responsibility | Sprint and verification |
|---|---|---|
| NFR-01 Auth enforcement (100% protected endpoints; no private data on reject) | F-01 | Sprint 1; AC/TEST — [D1-05] (API tests per protected endpoint) |
| NFR-02 Authorization enforcement (server-side; 0 bypasses) | F-01 | Sprint 1; AC/TEST — [D1-05] (forbidden-role + cross-owner API tests) |
| NFR-03 Credential protection (0 plaintext) | F-01 | Sprint 1; AC/TEST — [D1-05] (hash comparison + DB inspection) |
| NFR-04 Persistence and durability (restart **or redeployment**; 0 data loss) | F-10 (verification), F-02/F-03/F-04/F-05 (S1 data), F-06 (S2) | Sprint 1 (restart): AC/TEST — [D1-05]; redeployment: Lab 5 (redeploy, then read) |
| NFR-05 Concurrency safety (0 oversold states in N runs) | F-05 (enforced), F-03 (data) | Sprint 1; AC/TEST — [D1-05] (concurrency/integration test) |
| NFR-06 Transaction atomicity (checkout S1 / return S2; 0 partial updates) | F-05 (checkout), F-06 (return) | Sprint 1 (checkout): AC/TEST — [D1-05]; Sprint 2 (return): sprint 2 contracts |
| NFR-07 Performance baseline (catalog list ≤ 100 items, p95 ≤ 2 s) | F-02 (list), F-09 (reports) | Sprint 3; manual timing in release evidence |
| NFR-08 Reproducible setup (≤ 15 min via README) | F-10 | Sprint 1; manual setup run-through in release evidence |
| NFR-09 Test automation (100% Sprint 1 AC covered; non-zero exit on failure) | F-10 | Sprint 1; test report tied to release commit |

## 5. Coverage Summary and Gaps

| Set | Total | Mapped | Uncovered / gap |
|---|---|---|---|
| FR | 21 | 21 | 0 |
| BR | 13 | 13 | 0 |
| NFR | 9 | 9 | 0 |

- **Uncovered requirements:** none. Every FR/BR/NFR maps to at least one feature or named responsibility (`F-10` for cross-cutting verification).
- **Cross-cutting mappings** (requirement → several features) are intentional and listed in §2–§4 rows: BR-01/02/03 → F-03+F-04/F-05; BR-04/05/06 → F-01 + operation features; BR-11/NFR-04 → F-10 + data features; NFR-06 → F-05 + F-06.
- **Status note:** Sprint 2 contracts live under `docs/sprints/sprint-2/`, and Sprint 3 contracts live under `docs/sprints/sprint-3/`. Deliverable 2 Part D expands this matrix with actual test files, execution counts, and release commit SHAs.

## 6. Approved Changes and Decisions Reflected

| Change | Source | Effect on matrix |
|---|---|---|
| Quantity Tracking (A-01) | Team 2026-11-03 | BR-03 quantity-rule form; F-03 availability as quantity math |
| Direct Checkout (S1, A-02) → Approval Workflow (S2, A-11) | Team 2026-11-03 / 2026-11-06 / 2026-11-23 | S1: direct request→checkout; S2: `PENDING → APPROVED → CHECKED_OUT`, `PENDING → REJECTED`, `PENDING/APPROVED → CANCELLED` + `request_bundles` |
| Due date = checkout + 1–14 days (A-03 rev) | Team 2026-11-03 / 2026-11-23 | BR-07 7d in S1 (F-05); 1–14d in S2; overdue (BR-08) in S2 (F-07) |
| English documents (A-07) | Team 2026-11-03 | All Part B artifacts in English |
| SRS rev 2 (PR #15 review) | L0u1sss review | BR-11/NFR-04 redeployment wording; persistence/atomicity split S1/S2; BR-09 close-accounting guard |
| Sprint 2 Baseline Update (`docs/srs.md` rev 6) | User planning approval 2026-11-23 | Added `image_url`/`catalog_status`, sorting, two-step return notice/confirm, `BR-13` notifications, print slip; fixed BR count (`13 BR`) |

## 7. Open Questions Affecting This Matrix

| OQ | Impact on traceability | Target / Status |
|---|---|---|
| OQ-01 Initial catalog content | Seed fixtures + Custodian CRUD (`FR-09`) | Synthetic fixtures retained; CRUD open in Sprint 2 |
| OQ-02..OQ-06 | Resolved for Sprint 2 (`docs/srs.md` §7.3 rev 6) | Covered in `docs/sprints/sprint-2/` contracts |

---

*Document history: rev 1 created in [D1-02] (Part B) against `docs/srs.md` rev 2. Rev 2 (2026-11-05, [D1-05]) links the new planned Part E AC↔TEST matrix and clarifies that execution evidence belongs to Part F. Rev 3 (2026-11-23, Sprint 2 reconciliation): fixed stale `11 BR` count to `13 BR` (`BR-01`–`BR-13`) and aligned Sprint 2/3 requirement rows with `docs/srs.md` rev 6 and `docs/features.md` rev 2.*
