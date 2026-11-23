# F-09 — Inventory Reporting (Sprint 3 Contract & Deliverable 2 Progress)

> **Contract:** Sprint 3 · Feature `F-09`  
> **Revision:** 1 — 2026-11-23 · **Status:** Contract complete for Deliverable 2 Part C; Summary API + UI workflow targeted for initial Deliverable 2 implementation/testing (`GET /api/reports/summary` + `/reports`), with NFR-07 benchmark & CSV/detail drilldowns scheduled for Final Delivery (13 Dec)

---

## 1. Requirement Links & Boundaries

| Item | Basis |
|---|---|
| Functional Requirements | [SRS](../../srs.md) `FR-20` (inventory totals & availability, loans by status, overdue summary) |
| Non-Functional Requirements | `NFR-01`, `NFR-02`, `NFR-07` (catalog/report list ≤ 100 items, p95 ≤ 2 s) |
| Dependencies | `F-01`, `F-02`, `F-03`, `F-05`, `F-06`, `F-07`, `F-08` |

**No-change layers:** Read-only reporting; no separate reporting DB or ETL pipeline (`docs/system-sds.md` §3.4).

---

## 2. Feature SDS & Workflow

1. **Inventory & Loan Summary (`GET /api/reports/summary` — Implemented in D2 RC):**
   - `CUSTODIAN` only (`401` anonymous, `403` Borrower).
   - Queries live persisted tables in read-consistent aggregates:
     - `inventory`: `total_items`, `active_items`, `retired_items`, `total_units`, `held_units`, `available_units`, `unavailable_active_items`
     - `loans`: `active_count`, `return_pending_count`, `returned_count`, `overdue_count` (derived in `APP_TIMEZONE=Asia/Bangkok`)
     - `requests`: `pending_count`, `approved_count`, `rejected_count`, `cancelled_count`, `checked_out_count`
     - `items`: per-item breakdown (`id`, `name`, `category`, `catalog_status`, `quantity_total`, `held_units`, `quantity_available`, `availability`)
     - `overdue_loans`: list of overdue loan summaries (`loan_id`, `equipment_name`, `borrower_username`, `quantity_borrowed`, `due_on`, `days_overdue`)
2. **Custodian Reports Page (`/reports` — Implemented in D2 RC):**
   - Accessible from Custodian nav (`Reports`); displays KPI summary cards, item availability table, and overdue summary list.
3. **Remaining Sprint 3 Scope (Scheduled post-29 Nov → 13 Dec):**
   - `GET /api/reports/export` (CSV export / category breakdown filter) and formal `NFR-07` p95 timing measurement on 100-item catalog & report dataset.

---

## 3. Acceptance Criteria (AC-F09) & Current Deliverable 2 Status

| AC ID | Observable Acceptance Outcome | D2 Target Status |
|---|---|---|
| **AC-F09-01** | Custodian calling `GET /api/reports/summary` receives `200` with accurate live aggregates matching persisted `equipment`, `borrowing_requests`, and `loans` (including `overdue_count` in `Asia/Bangkok`). | **Implemented & Tested in D2 RC** |
| **AC-F09-02** | Anonymous caller receives `401`; Borrower calling `GET /api/reports/summary` (or navigating to `/reports`) receives `403 FORBIDDEN` without inventory/loan summary leaks. | **Implemented & Tested in D2 RC** |
| **AC-F09-03** | Custodian `/reports` UI renders inventory/loan/overdue summary cards and per-item availability table accurately after checkout/return mutations. | **Implemented & Tested in D2 RC** |
| **AC-F09-04** | Category/date-range report filter and CSV export (read-only) work accurately for Custodians and reject Borrowers (`403`). | **Planned (Sprint 3 completion by 13 Dec)** |
| **AC-F09-05** | `NFR-07` baseline timing benchmark: `GET /api/equipment` and `GET /api/reports/summary` with 100 seeded items complete at `p95 <= 2000 ms` locally. | **Planned (Sprint 3 verification by 13 Dec)** |

---

## 4. Software Test Specification (STS)

| Test ID | AC | Level | Preconditions / Input | Action & Expected Result | D2 Status |
|---|---|---|---|---|---|
| **TEST-F09-01** | AC-F09-01 | API/DB integration | Seeded active/retired items, pending/approved requests, active/overdue/returned loans; `C-A` | `GET /api/reports/summary` → `200`, all inventory/loan/request/overdue counts match SQL ground truth | **Implemented & Run in D2** |
| **TEST-F09-02** | AC-F09-02 | API/DB integration | Valid `B-A` session and anonymous client | Anonymous → `401`; `B-A` → `403 FORBIDDEN` with zero summary data | **Implemented & Run in D2** |
| **TEST-F09-03** | AC-F09-03 | UI/E2E | `C-A` browser after checkout/return; `B-A` browser | `C-A` opens `/reports` and verifies counts match DB; `B-A` sees access denied | **Implemented & Run in D2** |
| **TEST-F09-04** | AC-F09-04 | API/DB + UI | Category filter + CSV export (`C-A`, `B-A`) | Filtered totals & CSV rows match; `B-A` gets `403` | **Planned (Sprint 3)** |
| **TEST-F09-05** | AC-F09-05 | Performance check | 100 synthetic catalog items + active loans | Measure 20 repeated requests; `p95 <= 2000 ms` | **Planned (Sprint 3)** |

---

## 5. Definition of Done & Revision History
- Deliverable 2 Part C requires `AC-F09-01..03` implemented and tested (`TEST-F09-01..03`) and `AC-F09-04..05` explicitly tracked in the Remaining-Work Plan for 13 December.
- **Rev 1 (2026-11-23):** Initial Sprint 3 contract created during Sprint 2 per `project_deliverable_2_v1.pdf` §3.3.
