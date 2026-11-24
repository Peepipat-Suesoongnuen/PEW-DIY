# Sprint 2 Extensions — Approval Workflow, Multi-Item Bundles, Flexible Duration, Print Slip & Lab 6 Fixes

> **Contract:** Sprint 2 · Extensions to `F-04`/`F-05` + Lab 6 Remediation (`Finding 05`, `UAT-07`, `Phase P4`)  
> **Revision:** 1 — 2026-11-23 · **Status:** Baselines contract before implementation

---

## 1. Requirement Links & Boundaries

| Item | Basis |
|---|---|
| Functional Requirements | [SRS](../../srs.md) `FR-11`, `FR-12`, `FR-13`, `FR-14`, `FR-15` |
| Business Rules | `BR-01`, `BR-02`, `BR-04`, `BR-05`, `BR-07` (`1–14` days), `BR-12` (`A-11` non-reserving approval), `BR-13` (notifications on approval/rejection) |
| Defect / Debt Remediation | Lab 6 `Finding 05` (`CheckoutRequest.tsx` 409 clarity), `UAT-07 UX Note` (range hints/disabled affordance), `ARCH-01 Phase P4` (retire legacy `.html`) |

---

## 2. Feature SDS & Workflow

1. **Create Borrowing Request (`CreateRequestPage` + Backward-Compatible API):**
   - Borrower clicks **`Create Request`** (from Catalog/Requests nav) or `"Request this item"` on Item Detail.
   - Single-item API (`POST /api/requests`): keeps Sprint 1 `{ equipment_id, quantity_requested }` working (defaulting `requested_days = 7`, `purpose_category = "OTHER"`, `purpose_detail = ""`) while accepting optional `purpose_category`, `purpose_detail`, `requested_days` (`1..14`).
   - Multi-item Bundle API (`POST /api/request-bundles`): accepts `{ items: [{ equipment_id, quantity_requested }], purpose_category, purpose_detail, requested_days }`. Locks all referenced `equipment` rows in sorted `id` order (`FOR UPDATE`) to prevent deadlocks, validates `ACTIVE` + `BR-01` for every item, and inserts `1 request_bundles + N borrowing_requests` with `approval_status = 'PENDING'`. **Zero stock reservation (`BR-12`).**
2. **Approval, Rejection & Cancellation (`A-11`):**
   - **Borrower Cancel (`POST /api/requests/:id/cancel`, `POST /api/request-bundles/:bundleId/cancel`):** allowed only by owning Borrower while `approval_status IN ('PENDING', 'APPROVED')` and no linked `loans` row exists → sets `approval_status = 'CANCELLED'`.
   - **Custodian Approve (`POST /api/requests/:id/approve`, `/api/request-bundles/:bundleId/approve`):** `CUSTODIAN` only while `PENDING` → sets `approval_status = 'APPROVED'`, `reviewed_by`, `reviewed_at`, `decision_note`, and creates `REQUEST_APPROVED` notification in `notifications` (see `f-07-overdue-status.md` §3 schema). Still reserves zero stock (`BR-12`).
   - **Custodian Reject (`POST /api/requests/:id/reject`, `/api/request-bundles/:bundleId/reject`):** `CUSTODIAN` only while `PENDING` → sets `approval_status = 'REJECTED'`, `reviewed_by`, `reviewed_at`, `decision_note`, and creates `REQUEST_REJECTED` notification in `notifications` (`f-07-overdue-status.md` §3).
3. **Checkout (`POST /api/requests/:id/checkout` & `/api/request-bundles/:bundleId/checkout`):**
   - Requires `approval_status === 'APPROVED'` (rejects `PENDING` / `REJECTED` / `CANCELLED` with `409 NOT_APPROVED`).
   - Computes `due_on` = checkout date (`Asia/Bangkok`) + `requested_days` (`1..14`).
4. **Printable Loan Slip (`FR-15`):**
   - On `/loans/:id`, clicking **"Print Loan Slip"** renders a print-friendly slip (`@media print`) showing Loan ID, Borrower, Equipment(s), Quantity, Checkout timestamp, Due Date, Status, and Approver/Checkout Custodian.
5. **Lab 6 Remediation & Phase P4:**
   - **Finding 05:** `CheckoutRequest.tsx` distinguishes `409 INSUFFICIENT_AVAILABILITY`, `ALREADY_CHECKED_OUT`, and `NOT_APPROVED` cleanly without disclosing other borrowers' records.
   - **UAT-07 UX Note:** Request form shows explicit min/max stock range hints (`1–N`) and invalid feedback.
   - **Phase P4:** Retire `client/*.html` and legacy `.html` route handling in `auth-routes.ts` after verifying React/Playwright E2E tests cover all paths.

---

## 3. Acceptance Criteria (AC-F11)

| AC ID | Observable Acceptance Outcome | Basis |
|---|---|---|
| **AC-F11-01** | `POST /api/request-bundles` creates a multi-item `PENDING` bundle with purpose and `1–14` day duration without changing `quantity_available` (`BR-12`); invalid durations (`0`, `15`) or duplicate/empty items return `400`. | `FR-11`, `BR-07`, `BR-12` |
| **AC-F11-02** | Custodian approves/rejects `PENDING` request/bundle → `200`, creates `REQUEST_APPROVED`/`REQUEST_REJECTED` notification, leaves `quantity_available` unchanged; Borrower calling approve/reject receives `403`. | `FR-13`, `BR-04`, `BR-12`, `BR-13` |
| **AC-F11-03** | Checkout of `PENDING`/`REJECTED`/`CANCELLED` request returns `409 NOT_APPROVED`; checkout of `APPROVED` request/bundle creates Loan(s) with `due_on = checkout_date + requested_days` (`Asia/Bangkok`). | `FR-14`, `BR-02`, `BR-07` |
| **AC-F11-04** | Owning Borrower cancels `PENDING`/`APPROVED` unfulfilled request/bundle → `200 CANCELLED`; cross-owner Borrower or Custodian cancel returns `403`; cancelling `CHECKED_OUT` returns `409`. | `FR-11`, `BR-05` |
| **AC-F11-05** | `CheckoutRequest.tsx` shows distinct `INSUFFICIENT_AVAILABILITY` vs `ALREADY_CHECKED_OUT` vs `NOT_APPROVED` errors (Finding 05); Loan Detail provides printable slip; legacy `.html` routes are retired (Phase P4). | `Finding 05`, `FR-15`, `P4` |

---

## 4. Software Test Specification (STS)

| Test ID | AC | Level | Preconditions / Input | Action & Expected Result |
|---|---|---|---|---|
| **TEST-F11-01** | AC-F11-01 | API/DB integration | `B-A`; `E-ONE` (`1/1`), `E-MANY` (`3/3`), `requested_days=14` | `POST /api/request-bundles` → `201 PENDING`, stock stays `1/1` & `3/3`; `requested_days=15` → `400` |
| **TEST-F11-02** | AC-F11-02 | API/DB integration | `PENDING` bundle; `C-A`, `B-A` | `B-A` approve → `403`; `C-A` approve → `200 APPROVED`, notification created, stock unchanged |
| **TEST-F11-03** | AC-F11-03 | API/DB + Unit | `PENDING` vs `APPROVED` (`requested_days=3`, `14`) | Checkout `PENDING` → `409 NOT_APPROVED`; checkout `APPROVED` → `201`, `due_on = bangkok_date + requested_days` |
| **TEST-F11-04** | AC-F11-04 | API/DB integration | `B-A` `PENDING` and `CHECKED_OUT` requests; `B-B` | `B-A` cancels `PENDING` → `200 CANCELLED`; `B-B` cancel → `403`; cancel `CHECKED_OUT` → `409` |
| **TEST-F11-05** | AC-F11-05 | UI/Component + E2E | `CheckoutRequest` 409 responses; Loan Detail print button | Distinct Finding 05 error copy rendered; print slip renders loan metadata; legacy `*.html` (except `/index.html`) returns `404` while SPA routes render React |

---

## 5. Definition of Done & Revision History
- Satisfies `AC-F11-01`..`05`, TDD RED→GREEN evidence (`NOT_APPROVED` checkout & bundle non-reservation), peer-reviewed PR, and full regression.
- **Rev 1 (2026-11-23):** Initial Sprint 2 contract.
