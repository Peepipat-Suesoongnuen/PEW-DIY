# F-06 — Equipment Return (Return Notice & Custodian Confirmation)

> **Contract:** Sprint 2 · Feature `F-06`
>
> **Revision:** 2 — 2026-11-25 · **Status:** Implemented & verified (`Slice 4` + bundle return-notice extension)

---

## 1. Requirement Links & Boundaries

| Item | Basis |
|---|---|
| Functional Requirements | [SRS](../../srs.md) `FR-17` |
| Business Rules | `BR-04` (Custodian confirms return; Borrower may submit return notice on own active loan), `BR-09` (full-quantity return per loan; notice does not restore stock), `BR-11(S2)` |
| Non-Functional Requirements | `NFR-01`, `NFR-02`, `NFR-04(S2)`, `NFR-06(S2)` |
| Dependencies | `F-01`, `F-03`, `F-05` (`loans` table) |

**No-change layers:** No changes to `F-01` authentication or `F-03` availability formula (`available = quantity_total - held` where `held` sums `loans` with `returned_at IS NULL`). No partial-return or damage-assessment workflow (`A-12`, SRS §3.2).

---

## 2. Feature SDS & Workflow

1. **Optional Borrower Return Notice:** On own `ACTIVE` loan detail (or per-item row / bundle group on `LoansPage`), Borrower may submit a return notice for either a single loan (`POST /api/loans/:loanId/request-return`) or all unreturned loans in an entire bundle (`POST /api/loan-bundles/:bundleId/request-return`) with optional `return_note`, without restricting per-item returns when only part of a bundle is ready. Server sets `return_requested_at = now()`, `return_requested_by = user.id`, `return_note`. Affected loan statuses become `RETURN_PENDING`. Available quantity remains **unchanged**.
2. **Custodian Return Confirmation:** Custodian opens room loans / loan detail and clicks `"Confirm Return"` (`POST /api/loans/:loanId/return` or bundle return `POST /api/loan-bundles/:bundleId/return`).
   - Transaction protocol (`BEGIN ISOLATION LEVEL READ COMMITTED`):
     1. Require `CUSTODIAN` (`403` for Borrower).
     2. Read loan's `equipment_id` (`404` if missing).
     3. Lock `equipment` row(s) `FOR UPDATE` (ordered by `equipment_id` for bundles), then lock `loans` row(s) `FOR UPDATE`.
     4. If `returned_at IS NOT NULL`, abort and return `409 ALREADY_RETURNED`.
     5. Set `returned_at = now()`, `returned_by = user.id`, optional `return_note` (preserving existing note if empty).
     6. Commit; derived `held(item)` decreases and `quantity_available` restores atomically.

---

## 3. UI, API & Data Definitions

### Data (`loans` extensions in `MIGRATION_004_SPRINT2_SQL`)
- Reuse existing `returned_at TIMESTAMPTZ`, `returned_by TEXT REFERENCES users(id)` from Migration 003.
- Add `return_requested_at TIMESTAMPTZ`, `return_requested_by TEXT REFERENCES users(id)`, `return_note TEXT NOT NULL DEFAULT ''`.

### API
| Method & Path | Role & Scope | Request Body | Success | Errors |
|---|---|---|---|---|
| `POST /api/loans/:loanId/request-return` | `BORROWER` (own active loan) | `{ "return_note"?: string }` | `200 { data: LoanView }` (`status: "RETURN_PENDING"`) | `400`, `401`, `403`, `404`, `409 ALREADY_RETURNED` |
| `POST /api/loan-bundles/:bundleId/request-return` | `BORROWER` (own bundle loans) | `{ "return_note"?: string }` | `200 { data: LoanView[] }` (`status: "RETURN_PENDING"` on active loans in bundle) | `400`, `401`, `403`, `404`, `409 ALREADY_RETURNED` |
| `POST /api/loans/:loanId/return` | `CUSTODIAN` only | `{ "return_note"?: string }` | `200 { data: LoanView }` (`status: "RETURNED"`) | `400`, `401`, `403`, `404`, `409 ALREADY_RETURNED`, `500/503` |
| `POST /api/loan-bundles/:bundleId/return` | `CUSTODIAN` only | `{ "return_note"?: string }` | `200 { data: LoanView[] }` | `400`, `401`, `403`, `404`, `409 ALREADY_RETURNED`, `500/503` |

### UI (`LoansPage` / `LoanDetails`)
- Borrower sees `"Notify return"` / `"Request Return"` on individual `ACTIVE` loans AND `"Notify return for entire bundle (N)"` inside collapsible full-width bundle drawers (`LoansPage`) while keeping per-item return notices independent; replaced by `"Return requested — awaiting Custodian confirmation"` once `RETURN_PENDING`; no `"Confirm Return"` button.
- Custodian sees `"Confirm return"` / `"Confirm Return"` per loan AND `"Confirm bundle return (N)"` inside collapsible bundle drawers (`LoansPage`), using `100%`-budget `table-fixed` columns (zero horizontal scroll), unified 2-line cells with `#XXXXXXXX` short-ref, and universal `Pagination` (`10` rows/page default).

---

## 4. Acceptance Criteria (AC-F06)

| AC ID | Observable Acceptance Outcome | Requirement Basis |
|---|---|---|
| **AC-F06-01** | Borrower submits `request-return` on own `ACTIVE` loan → `200` `RETURN_PENDING`, persisted; `quantity_available` stays unchanged (`BR-09`). | `FR-17`, `BR-09` |
| **AC-F06-02** | Custodian confirms return (`POST /api/loans/:id/return`) → `200` `RETURNED`, `returned_at`/`returned_by` persisted, `quantity_available` restored atomically (`BR-09`). | `FR-17`, `BR-09`, `NFR-06` |
| **AC-F06-03** | Repeat return on an already `RETURNED` loan (or request-return on `RETURNED` loan) → `409 ALREADY_RETURNED` with zero stock/loan changes. | `BR-09`, `NFR-06` |
| **AC-F06-04** | Anonymous caller receives `401`; Borrower calling `/return` (even on own loan) receives `403`; Borrower calling `/request-return` on another Borrower's loan receives `403`. | `BR-04`, `BR-05`, `NFR-01/02` |
| **AC-F06-05** | Fault injected before return commit rolls back `returned_at`/`returned_by` and leaves `quantity_available` unchanged; returned state persists across restart. | `BR-11`, `NFR-04`, `NFR-06` |
| **AC-F06-06** | UI workflow: Borrower requests return → Custodian confirms return → catalog availability updates and loan moves to History. | `FR-17` |

---

## 5. Software Test Specification (STS)

| Test ID | AC | Level | Preconditions / Input | Action & Expected Result |
|---|---|---|---|---|
| **TEST-F06-01** | AC-F06-01 | API/DB integration | Active loan `L1` (qty 2 on `E-MANY` `3/3 → 1/3`); `B-A` | `POST /api/loans/L1/request-return` → `200`, `status=RETURN_PENDING`, `E-MANY` still `1/3` |
| **TEST-F06-02** | AC-F06-02 | API/DB integration | Active/Return-pending `L1`; `C-A` | `POST /api/loans/L1/return` → `200`, `status=RETURNED`, `E-MANY` restored to `3/3` |
| **TEST-F06-03** | AC-F06-03 | API/DB integration | Already returned `L1`; `C-A` and `B-A` | Repeat `POST /return` and `POST /request-return` → `409 ALREADY_RETURNED`, `E-MANY` stays `3/3` |
| **TEST-F06-04** | AC-F06-04 | API/DB integration | Active `L1` owned by `B-A`; anonymous, `B-A`, `B-B` | Unauth → `401`; `B-A` `/return` → `403`; `B-B` `/request-return` → `403` |
| **TEST-F06-05** | AC-F06-05 | API/DB + Restart | Test hook fails before commit; then clean return + restart | Failed commit leaves loan `ACTIVE` and stock held; committed return survives restart |
| **TEST-F06-06** | AC-F06-06 | UI/E2E | Real browser/DB (`B-A`, `C-A`) | `B-A` clicks Request Return, `C-A` clicks Confirm Return, catalog availability restores |

---

## 6. Definition of Done & Revision History
- Satisfies all `AC-F06-01`..`06`, TDD RED→GREEN logs retained, peer-reviewed PR into `sprint/2-staging`, and full regression pass.
- **Rev 1 (2026-11-23):** Initial Sprint 2 contract authored before implementation.
- **Rev 2 (2026-11-25):** Added `POST /api/loan-bundles/:bundleId/request-return` for one-click whole-bundle Borrower return notices while preserving per-item partial bundle return flexibility, plus collapsible bundle rows & `#XXXXXXXX` short-ref search on `LoansPage`.
