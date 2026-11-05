# PEW-DIY UI Requirement Traceability — UI-01

> **Issue:** [#30 — UI-01](https://github.com/Peepipat-Suesoongnuen/PEW-DIY/issues/30) · **Companion of:** [ui-spec.md](ui-spec.md) · [design-decisions.md](design-decisions.md)
> **Chain:** Stakeholder Need (SN, Part B) → FR/BR (SRS rev 2) → UI Component / Interaction (this spec) → AC (Sprint 1 contracts)
> **Rule (task §6.E):** UI without requirement or requirement without UI is recorded as a **Gap** — no requirement is invented to make the table look complete.

---

## 1. Traceability Matrix

**Coverage legend (review fix — "Covered" never means an AC is verified/passed):**
- **UI contribution** — this spec designs the UI side of the AC; full AC verification still requires implementation + tests (API/DB/UI-E2E per product-dod)
- **Partial (UI + tests)** — UI design covers only part of the AC (e.g., state rendering); server behavior/persistence parts are proven by implementation tests
- **Outside UI-01 scope** — the AC belongs to screens not in these 3 pages (recorded, not claimed)

| SN | FR / BR | UI Component / Interaction (ui-spec.md) | AC (contract) | Coverage |
|---|---|---|---|---|
| SN-01 know availability before borrowing | FR-06 catalog fields | Catalog Table / ItemCard (§2.2) | AC-F02-01 | Partial (UI + tests) — UI renders fields/no-private-data; persisted-item comparison = API/DB tests |
| SN-01 | FR-07 availability display | Availability Badge + Available quantity (§2.2, §3.2) | AC-F02-01 | Partial (UI + tests) |
| SN-01 | FR-06/07 detail display | Item Detail info block (§3.2) | AC-F02-01, AC-F02-02 | Partial (UI + tests) |
| SN-01 | FR-06 empty/missing states | Empty + "Item not found" states (§2.3, §3.4) | AC-F02-02 | UI contribution (404/200 semantics = API tests) |
| SN-02 borrow equipment | FR-11 submit request | Item Detail "Request to borrow" panel + Quantity input (§3.2) | AC-F04-01 | Partial (UI + tests) — 201/persistence = API/DB tests; bounds gated by OQ-02 |
| SN-02 | BR-01 request only when available | Unavailable state → no request form (§3.2/§3.4) | AC-F04-02 (negative) | Partial (UI + tests) — 409 semantics = server |
| SN-02 | FR-11 validation | Quantity `FieldError` feedback (§3.2) | AC-F04-03 | UI contribution (forged-field/400 enforcement = server) |
| SN-02 | FR-11 post-submit flow | Redirect → My Requests + confirmation there (§3.2 Success row) | AC-F04-08 | **Partial across screens** — submit UI here; own-request display + reload = My Requests screen (F-04 UI, outside 3 pages) |
| SN-02 | FR-12/FR-13 view requests | My Requests / Submitted Requests screens | AC-F04-04 (own-request access), AC-F04-05 (custodian queue) | **Outside UI-01 scope** — F-04/F-05 screens (deferred) |
| SN-02 | FR-14..FR-16 checkout/loans | Submitted Requests → Checkout; My Loans (F-05) | AC-F05-xx | Outside UI-01 scope — deferred to F-05 |
| SN-04/05 monitoring & records | FR-17..FR-21 (Sprint 2–3) | Return/Overdue/Reports screens | — | Deferred (later sprints) |
| SN-06 data privacy & staff control | FR-01 login | Login form + generic error (§1.2/§1.3) | AC-F01-01, AC-F01-02 | Partial (UI + tests) — generic-error semantics = API tests |
| SN-06 | FR-02 logout | AccountMenu → Sign out (§2.2); logout states (§0.3) | AC-F01-06 | Partial (UI + tests) — revocation = API/DB tests |
| SN-06 | FR-03 current-user | AccountMenu identity + role-aware Nav (§2.2) | AC-F01-04 | UI contribution (identity source = API) |
| SN-06 | FR-04 two roles enforced | Role-aware navigation; Borrower-only request panel; Custodian sees no request action (§2.2, §3.2) | AC-F01-08, AC-F02-01 | Partial (UI + tests) — UI hides are convenience only; enforcement = server |
| SN-06 | FR-05 own records only | *(cross-owner rules apply to My Requests/Loans screens — F-04/F-05 UI)* | AC-F01-09 | Outside UI-01 scope — deferred to F-04/F-05 UI |
| — | BR-04/BR-06 role restrictions | "Hiding controls is not authorization" principle (§2.2, §3.2) | AC-F01-08 | UI contribution (enforcement = server) |
| — | BR-10/NFR-03 password safety | Password field + visibility toggle (§1.2); no password in browser storage (§1.3) | AC-F01-10 | UI contribution (hash/storage proof = tests) |
| — | NFR-01 no private data on denial | 401/403 states clear private data (§0.3) | AC-F01-05 | Partial (UI + tests) |
| — | NFR-02 server-side authz | UI notes: UI hiding ≠ authorization (§2.2, §3.2) | AC-F01-08 | UI contribution (UI side only) |
| — | SRS A-01 Quantity Tracking | Quantity Information block (§3.2) | AC-F02-01 | UI contribution |
| — | SRS A-02 Direct Checkout | No approval step anywhere; submit → My Requests (§3.2) | AC-F04-01, AC-F04-08 | Partial (UI + tests) |
| — | FR-10 search/filter (Sprint 2) | Catalog search/filter row — **deliberately not rendered in Sprint 1** (§2.2) | AC-F02-06 ("no search controls added") | UI contribution (negative: absence is the design) + Sprint 2 (F-08) |
| — | FR-06/07 loading/error states | Loading + safe server failure states (§2.3, §3.3) | AC-F02-06, AC-F02-07 | UI contribution (safe envelope = server) |
| — | NFR-05/06 concurrency/atomicity | **Not UI-provable** — backend behavior | AC-F02-04, AC-F02-05, AC-F02-08 (seed/schema/restart), AC-F04-06/07/09 | **Outside UI-01 scope** — verified by API/DB tests (see §2) |

## 2. Requirement Coverage Check (3 pages) — per-AC mapping

**Catalog (f-02):**

| AC | What the AC really requires | UI-01 coverage |
|---|---|---|
| AC-F02-01 | List + E-ONE detail render agreed fields; no private fields; list/detail consistent | **Partial** — UI renders; persistence/consistency = API/DB tests |
| AC-F02-02 | Empty = `200 data=[]` + empty UI; unknown id = safe 404 + missing UI | **Partial** — UI states designed; 200/404 semantics = API tests |
| AC-F02-03 | 401 for bad/absent credentials; both roles allowed | **Partial** — 401 state designed; auth behavior = API tests |
| AC-F02-04 | Seed idempotency; no credentials in fixtures/logs | **Outside UI-01 scope** — DB/seed work, not UI design |
| AC-F02-05 | Schema rejects missing/negative/fractional totals | **Outside UI-01 scope** — DB/typed-boundary work |
| AC-F02-06 | Loading/loaded/empty/missing/401/error distinguishable; nav works both roles; no editing/search controls | **UI contribution (core of this spec)** — §2.3 states + §2.2 nav; "works" verified by UI/E2E tests |
| AC-F02-07 | DB failure → safe shared error + recoverable UI state | **Partial** — UI error/retry state; envelope safety = server tests |
| AC-F02-08 | Catalog survives restart; no startup reseed | **Outside UI-01 scope** — persistence work (restart-e2e tests) |

**Item Detail (f-04):**

| AC | What the AC really requires | UI-01 coverage |
|---|---|---|
| AC-F04-01 | Submit qty-1 request → 201, persisted, server-owned fields | **Partial** — request panel UI; persistence = API/DB tests |
| AC-F04-02 | BR-01 unavailable → 409, no write | **Partial** — unavailable state + 409 error display; enforcement = server |
| AC-F04-03 | Invalid quantities/forged fields → 400, no writes | **Partial** — client validation feedback; server rejection = tests |
| AC-F04-04 | Borrower accesses only own requests | **Outside UI-01 scope** — My Requests screen (F-04 UI) |
| AC-F04-05 | Custodian queue view | **Outside UI-01 scope** — Submitted Requests screen (F-05 UI) |
| AC-F04-08 | Submit → own-request display → reload; states match API | **Partial across screens** — submit + redirect UI here; display/reload on My Requests (F-04 UI) |

Note: AC-F04-06/07/09 (stock effects, restart, OQ-02 limits) are backend behaviors — outside UI-01 scope entirely.

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
