# Requirements Traceability Matrix (Part B)

> **Project:** PEW-DIY — D.I.Y. Room Equipment Borrowing System
> **Deliverable:** D1-02 Part B — Feature Inventory and Traceability | **Issue:** [D1-02]
> **Status:** Draft for team review | **Language:** English (team decision A-07)
> **Sources of truth:** `docs/srs.md` (rev 2, approved) · `docs/features.md` (companion)
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
| FR-06 Equipment catalog (name, description, category, total qty, availability) | F-02 | Sprint 1 (seed + read); AC/TEST — [D1-05] |
| FR-07 Compute and display Available Quantity | F-03 | Sprint 1; AC/TEST — [D1-05] |
| FR-08 Seeded demo catalog, reproducible, synthetic | F-02 | Sprint 1; AC/TEST — [D1-05] (seed reproducibility) |
| FR-09 Custodian creates/updates/retires items, adjusts quantity | F-08 | Sprint 2; contract in [D1-05]-style sprint 2 contracts |
| FR-10 Search/filter catalog (name, category, availability) | F-08 | Sprint 2; sprint 2 contracts |
| FR-11 Borrower submits request for available item, persisted | F-04 | Sprint 1; AC/TEST — [D1-05] (request persists; unavailable rejected per BR-01) |
| FR-12 Borrower views own requests with status | F-04 | Sprint 1; AC/TEST — [D1-05] |
| FR-13 Custodian views submitted requests | F-04 | Sprint 1; AC/TEST — [D1-05] |
| FR-14 Custodian records checkout → Active Loan + availability, atomic | F-05 | Sprint 1; AC/TEST — [D1-05] (atomicity per NFR-06 S1) |
| FR-15 Active Loan records (borrower, item, qty, checkout, due, status) | F-05 | Sprint 1; AC/TEST — [D1-05] |
| FR-16 Borrower views own active loans / history | F-05 (active) / F-08 (full history) | Sprint 1 (active): AC/TEST — [D1-05]; Sprint 2 (full history): sprint 2 contracts |
| FR-17 Custodian records return → close loan + restore availability, atomic | F-06 | Sprint 2; sprint 2 contracts (atomicity per NFR-06 S2) |
| FR-18 Custodian views all active loans | F-08 | Sprint 2; sprint 2 contracts |
| FR-19 Overdue computation + overdue list for custodians | F-07 | Sprint 2; sprint 2 contracts |
| FR-20 Inventory reports/summaries | F-09 | Sprint 3; sprint 3 contracts |
| FR-21 Borrower borrow/return history | F-08 | Sprint 2; sprint 2 contracts |

## 3. Business Rules (BR-01 – BR-11)

| Requirement | Feature or responsibility | Sprint and verification |
|---|---|---|
| BR-01 Request only when Available Qty ≥ 1 (at request time) | F-04 (enforced), F-03 (data) | Sprint 1; AC/TEST — [D1-05] (negative: request unavailable item rejected) |
| BR-02 Checkout of unavailable item rejected | F-05 (enforced), F-03 (data) | Sprint 1; AC/TEST — [D1-05] (negative: checkout when qty = 0 rejected) |
| BR-03 Available Qty never < 0; single-unit item ≤ 1 active loan | F-05 (enforced), F-03 (data) | Sprint 1; AC/TEST — [D1-05] (negative: duplicate loan rejected; NFR-05 concurrency) |
| BR-04 Only Custodian performs checkout/return | F-01 (enforcement), F-05, F-06 (operations) | Sprint 1 (checkout enforcement): AC/TEST — [D1-05]; return enforcement in sprint 2 contracts |
| BR-05 Borrower sees only own requests/loans | F-01 (enforcement), F-04, F-05 (data) | Sprint 1; AC/TEST — [D1-05] (cross-borrower denial) |
| BR-06 Only Custodian modifies catalog | F-01 (enforcement), F-02 (S1 read), F-08 (S2 write) | Sprint 1 (enforcement on existing endpoints): AC/TEST — [D1-05]; write endpoints in sprint 2 contracts |
| BR-07 Due date = checkout + 7 calendar days (A-03) | F-05 | Sprint 1; AC/TEST — [D1-05] (due date equality) |
| BR-08 Loan overdue when now > due date and no return | F-07 | Sprint 2; sprint 2 contracts |
| BR-09 Return closes loan, restores availability; all held qty accounted at close | F-06 | Sprint 2; sprint 2 contracts — semantics for partial return gated by OQ-02 |
| BR-10 Passwords stored as salted hashes only | F-01 | Sprint 1; AC/TEST — [D1-05] (DB/seed inspection test) |
| BR-11 Persist all state transitions; survive restart **or redeployment** | F-10 (verification), F-05 (S1 request/checkout), F-06 (S2 return) | Sprint 1 (request/checkout, restart): AC/TEST — [D1-05]; Sprint 2 (return): sprint 2 contracts; redeployment: Lab 5 |

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
| BR | 11 | 11 | 0 |
| NFR | 9 | 9 | 0 |

- **Uncovered requirements:** none. Every FR/BR/NFR maps to at least one feature or named responsibility (F-10 for cross-cutting verification).
- **Cross-cutting mappings** (requirement → several features) are intentional and listed in §2–§4 rows: BR-01/02/03 → F-03+F-04/F-05; BR-04/05/06 → F-01 + operation features; BR-11/NFR-04 → F-10 + data features; NFR-06 → F-05 + F-06.
- **Known limitations of this revision:** AC/TEST IDs are placeholders pending [D1-05] contracts (per §3.2, only Sprint 1 needs them now); Sprint 2/3 rows carry sprint allocation only, as required. The "implemented test/result" column will be added in Deliverable 2 traceability.

## 6. Approved Changes and Decisions Reflected

| Change | Source | Effect on matrix |
|---|---|---|
| Quantity Tracking (A-01) | Team 2026-11-03 | BR-03 quantity-rule form; F-03 availability as quantity math |
| Direct Checkout (A-02) | Team 2026-11-03 | No approval feature; request (F-04) → checkout (F-05) direct |
| Due date = checkout + 7 days (A-03) | Team 2026-11-03 | BR-07 in Sprint 1 (F-05); overdue (BR-08) stays Sprint 2 (F-07) |
| English documents (A-07) | Team 2026-11-03 | All Part B artifacts in English |
| SRS rev 2 (PR #15 review) | L0u1sss review | BR-11/NFR-04 redeployment wording; persistence/atomicity split S1/S2; BR-09 close-accounting guard; OQ-02 coupled-decision note |

## 7. Open Questions Affecting This Matrix (not resolved here)

| OQ | Impact on traceability | Target |
|---|---|---|
| OQ-01 Initial catalog content | Seed data for F-02 (FR-08) | Before Sprint 1 seed implementation |
| OQ-02 Multi-unit loans + partial-return coupling | Request/loan data model (F-04/F-05) and BR-09 semantics (F-06) | Before [D1-05] contracts |
| OQ-03..OQ-06 | Sprint 2/3 features (F-06–F-09) detail | Before respective sprint contracts |

---

*Document history: rev 1 created in [D1-02] (Part B) against `docs/srs.md` rev 2. Rev 2 (2026-11-05, [D1-05]) links the new planned Part E AC↔TEST matrix and clarifies that execution evidence belongs to Part F; no requirement-to-feature or sprint allocation changed. Feature IDs `F-01`–`F-10` are stable; future changes require a recorded revision with rationale (AGENT.md §15.1).*
