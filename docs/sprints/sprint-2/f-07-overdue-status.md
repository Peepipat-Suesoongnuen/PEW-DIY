# F-07 — Overdue Status & Dismissible In-App Notifications

> **Contract:** Sprint 2 · Feature `F-07`  
> **Revision:** 1 — 2026-11-23 · **Status:** Baselines contract before implementation

---

## 1. Requirement Links & Boundaries

| Item | Basis |
|---|---|
| Functional Requirements | [SRS](../../srs.md) `FR-19` |
| Business Rules | `BR-08` (derived overdue: `returned_at IS NULL AND business_current_date > due_on` in `Asia/Bangkok`), `BR-13` (dismissible/clearable in-app alerts) |
| Non-Functional Requirements | `NFR-01`, `NFR-02`, `NFR-04(S2)` |
| Dependencies | `F-01`, `F-05` (`loans`), `F-06` (`returned_at` clears overdue) |

**No-change layers:** No fines, no external email/SMS (`SRS §3.2`), no scheduled cron job mutating loan status (`overdue` is derived from `APP_TIMEZONE`).

---

## 2. Feature SDS & Workflow

1. **Derived Overdue Logic:** Using injected/server `now()` converted to `YYYY-MM-DD` in `APP_TIMEZONE` (`Asia/Bangkok`):
   - `overdue = (returned_at === null) && (business_today > due_on)`
   - Equality (`business_today === due_on`) is **NOT overdue**.
   - Returned loans (`returned_at !== null`) are **never overdue**.
2. **Custodian Overdue View:** `GET /api/loans?scope=overdue` returns all unreturned loans where `overdue === true`, sorted by `due_on ASC`. Borrowers calling `scope=overdue` for all-room loans receive `403` (Borrower only accesses own loans).
3. **In-App Notifications (`notifications` table):**
   - `REQUEST_APPROVED` / `REQUEST_REJECTED` rows created when Custodian approves/rejects a request/bundle.
   - `LOAN_DUE_SOON` (`0 <= diff_days(due_on, today) <= 2`) and `LOAN_OVERDUE` (`today > due_on`) synced idempotently (`ON CONFLICT (user_id, kind, reference_id) DO NOTHING`) when `GET /api/notifications` runs.
   - Users see active alerts (`read_at IS NULL AND cleared_at IS NULL`) in the header `NotificationMenu`, can mark individual alerts as read (`POST /api/notifications/:id/read` — removes from list), or click **"Clear all"** (`DELETE /api/notifications` — clears all alerts for that user only).

---

## 3. UI, API & Data Definitions

### Data (`notifications` in `MIGRATION_004_SPRINT2_SQL`)
- `id TEXT PK`, `user_id TEXT NOT NULL REFERENCES users(id)`, `kind TEXT`, `reference_id TEXT`, `title TEXT`, `message TEXT`, `created_at TIMESTAMPTZ`, `read_at TIMESTAMPTZ`, `cleared_at TIMESTAMPTZ`, `UNIQUE (user_id, kind, reference_id)`.

### API
| Method & Path | Role & Scope | Success | Errors |
|---|---|---|---|
| `GET /api/loans?scope=overdue` | `CUSTODIAN` only (room overdue list) | `200 { data: LoanView[] }` | `401`, `403` (Borrower) |
| `GET /api/notifications` | `BORROWER` / `CUSTODIAN` (own alerts) | `200 { data: NotificationView[] }` | `401` |
| `POST /api/notifications/:id/read` | Owner only | `200 { data: { id, read_at } }` | `401`, `403` (other user's alert), `404` |
| `DELETE /api/notifications` | Own alerts only | `204` | `401` |

---

## 4. Acceptance Criteria (AC-F07)

| AC ID | Observable Acceptance Outcome | Requirement Basis |
|---|---|---|
| **AC-F07-01** | Active loan with `today === due_on` (`Asia/Bangkok`) has `overdue=false`; `today > due_on` has `overdue=true`; once returned, `overdue=false`. | `FR-19`, `BR-08` |
| **AC-F07-02** | Custodian `GET /api/loans?scope=overdue` returns only overdue unreturned loans; Borrower calling `scope=overdue` receives `403`. | `FR-19`, `NFR-02` |
| **AC-F07-03** | Borrower receives `REQUEST_APPROVED`/`REQUEST_REJECTED` notification upon review, `LOAN_DUE_SOON` when `0 <= due_on - today <= 2` days, and `LOAN_OVERDUE` when past due. | `FR-19`, `BR-13` |
| **AC-F07-04** | Marking a notification read removes it from active list and persists across reload; `DELETE /api/notifications` clears all own notifications without affecting other users or loan/request rows. | `BR-13`, `BR-05` |
| **AC-F07-05** | Cross-owner `POST /api/notifications/:id/read` returns `403`; anonymous calls return `401`. | `NFR-01/02` |

---

## 5. Software Test Specification (STS)

| Test ID | AC | Level | Preconditions / Input | Action & Expected Result |
|---|---|---|---|---|
| **TEST-F07-01** | AC-F07-01 | Unit + API/DB | Controlled clock `now`; loan due `2026-11-30` | At `2026-11-30T23:59+07:00` → `overdue=false`; at `2026-12-01T00:01+07:00` → `overdue=true`; after return → `overdue=false` |
| **TEST-F07-02** | AC-F07-02 | API/DB integration | Overdue + non-overdue + returned loans; `C-A`, `B-A` | `C-A` gets only overdue unreturned loan; `B-A` gets `403` |
| **TEST-F07-03** | AC-F07-03, AC-F07-04 | API/DB integration | Approved request + loan due in 2 days; `B-A`, `B-B` | `B-A` gets alerts; marks 1 read → removed; `DELETE /api/notifications` → empty `[]` on reload; `B-B` alerts untouched |
| **TEST-F07-04** | AC-F07-05 | API/DB integration | `B-A` notification ID; `B-B`, anonymous | Anonymous → `401`; `B-B` → `403` |
| **TEST-F07-05** | AC-F07-03, AC-F07-04 | UI/E2E | Browser session with notifications | Bell badge shows count, user checks/reads item (disappears) and clicks Clear all |

---

## 6. Definition of Done & Revision History
- Satisfies `AC-F07-01`..`05`, TDD RED→GREEN evidence on date boundary (`TEST-F07-01`), peer review, and full regression.
- **Rev 1 (2026-11-23):** Initial Sprint 2 contract.
