# PEW-DIY UI Requirement Traceability — UI-01

> **Issue:** [#30 — UI-01](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/30) · **Companion of:** [ui-spec.md](ui-spec.md) · [design-decisions.md](design-decisions.md)
> **Chain:** Stakeholder Need (SN, Part B) → FR/BR (SRS rev 2) → UI Component / Interaction (this spec) → AC (Sprint 1 contracts)
> **Rule (task §6.E):** UI without requirement or requirement without UI is recorded as a **Gap** — no requirement is invented to make the table look complete.

---

## 1. Traceability Matrix

| SN | FR / BR | UI Component / Interaction (ui-spec.md) | AC (contract) | Status |
|---|---|---|---|---|
| SN-01 know availability before borrowing | FR-06 catalog fields | Catalog Table / ItemCard (§2.2) | AC-F02-01 | Covered |
| SN-01 | FR-07 availability display | Availability Badge + Available quantity (§2.2, §3.2) | AC-F02-01 | Covered |
| SN-02 borrow equipment | FR-11 submit request | Item Detail "Request to borrow" panel + Quantity input (§3.2) | AC-F04-01, AC-F04-02 | Covered (bounds gated by OQ-02) |
| SN-02 | BR-01 request only when available | Unavailable state → no request form (§3.2/§3.4) | AC-F04-02 (negative) | Covered |
| SN-02 | FR-12/FR-13 view requests | **Not in this spec's 3 pages** — My Requests / Submitted Requests screens belong to F-04 UI work | — | Deferred to F-04 issue |
| SN-02 | FR-14..FR-16 checkout/loans | **Out of UI-01 scope** — Submitted Requests/My Loans screens (F-05) | — | Deferred to F-05 issue |
| SN-04/05 monitoring & records | FR-17..FR-21 (Sprint 2–3) | Return/Overdue/Reports screens | — | Deferred (later sprints) |
| SN-06 data privacy & staff control | FR-01 login | Login form + generic error (§1.2/§1.3) | AC-F01-01, AC-F01-02 | Covered |
| SN-06 | FR-02 logout | AccountMenu → Sign out (§2.2); logout states (§0.3) | AC-F01-06 | Covered |
| SN-06 | FR-03 current-user | AccountMenu identity + role-aware Nav (§2.2) | AC-F01-04 | Covered |
| SN-06 | FR-04 two roles enforced | Role-aware navigation; Borrower-only request panel; Custodian sees no request action (§2.2, §3.2) | AC-F01-08, AC-F02-01 | Covered (UI hides are convenience only — server enforces) |
| SN-06 | FR-05 own records only | *(cross-owner rules apply to My Requests/Loans screens — F-04/F-05 UI)* | AC-F01-09 | Deferred to F-04/F-05 UI |
| — | BR-04/BR-06 role restrictions | "Hiding controls is not authorization" principle in §2.2/§3.2 | AC-F01-08 | Covered |
| — | BR-10/NFR-03 password safety | Password field + visibility toggle (§1.2); no password in browser storage (§1.3) | AC-F01-10 | Covered |
| — | NFR-01 no private data on denial | 401/403 states clear private data (§0.3) | AC-F01-05 | Covered |
| — | NFR-02 server-side authz | UI notes: UI hiding ≠ authorization (§2.2, §3.2) | AC-F01-08 | Covered (UI side) |
| — | FR-10 search/filter (Sprint 2) | Catalog search/filter row — **not rendered in S1** (§2.2) | AC-F02-06 (no search controls added) | Sprint 2 (F-08) |
| — | SRS A-01 Quantity Tracking | Quantity Information block (§3.2) | AC-F02-01 | Covered |
| — | SRS A-02 Direct Checkout | No approval step anywhere; success = request submitted (§3.2) | AC-F04-01 | Covered |

## 2. Requirement Coverage Check (3 pages)

| Page | FR covered | AC covered |
|---|---|---|
| Login | FR-01–04, BR-10, NFR-01/02/03 | AC-F01-01..06, 08, 10, 11 |
| Catalog | FR-06/07, BR-04/06 (read side) | AC-F02-01..08 |
| Item Detail | FR-06/07 (read), FR-11 (request) | AC-F02-01/02/06, AC-F04-01..05 |

## 3. UI Elements with no Requirement backing (Gaps — NOT invented as requirements)

| UI element (task brief listed) | Finding | Decision |
|---|---|---|
| **Item image** on Item Detail | FR-06 fields = name/description/category/quantity/availability — **no image** | **Gap** — not designed; needs SRS change first (OQ-UI-3) |
| **Sorting** on Catalog | No FR for sorting exists | **Gap** — out of scope (OQ-UI-4) |
| **Password visibility toggle** | No FR requires/forbids it | **Proposed UX addition** (C-3) — security-neutral; team may drop |
| **"Checkout Action" wording** | Approved contracts define the item action as "Request to borrow" (FR-11); checkout is the custodian operation (FR-14) | Spec follows approved SRS (OQ-UI-5 — team confirm) |

## 4. Requirements with no UI in the 3 pages (expected — owned by later features)

| Requirement | Owning feature | Screen (future) |
|---|---|---|
| FR-12/FR-13 (view requests) | F-04 | My Requests / Submitted Requests |
| FR-14–FR-16 (checkout/loans) | F-05 | Submitted Requests → Checkout; My Loans |
| FR-17–FR-21 (return, overdue, history, reports) | F-06..F-09 | Return/Overdue/Reports (Sprint 2–3) |
| FR-10 (search/filter) | F-08 | Catalog search row (Sprint 2) |

These are **not gaps** — they are allocated to features outside UI-01's 3-page scope and will receive their own UI specs with their features.

## 5. Consistency Checks

- No contradiction with [Architecture Change Proposal](../architecture/frontend-change-proposal.md): tokens (§8), breakpoints (§10), custom components (§8.4), Lucide (§9) — all reused, none changed.
- No contradiction with SRS/contracts: behavior states copied from f-01 §2.3 / f-02 §3; Direct Checkout and Quantity Tracking respected (no approval step, no serial tracking).
- **No requirements or business rules were created** in this document.
